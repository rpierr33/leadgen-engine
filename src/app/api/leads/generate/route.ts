import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSearchProvider, buildSearchQueries } from "@/lib/search";
import { fetchScrapeUrl } from "@/lib/scraper/fetch-scraper";
import { createExtractor } from "@/lib/extractor";
import { enrichLead } from "@/lib/enrichment";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, industry, limit = 10, offset = 0, sources = ["web"], minQuality = 0 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const maxLeads = Math.min(Math.max(Number(limit), 1), 50);
    const skipUrls = Math.max(Number(offset), 0);

    // Create job
    const job = await prisma.job.create({
      data: {
        query,
        industry: industry || null,
        status: "RUNNING",
        mode: Array.isArray(sources) ? sources.join(",") : null,
      },
    });

    // Search for URLs from selected sources
    const searchProvider = createSearchProvider();
    const selectedSources = Array.isArray(sources) ? sources : ["web"];
    const queries = buildSearchQueries(query, industry, selectedSources);
    // Run up to 6 queries (more sources = more queries, but cap it)
    const queriesToRun = queries.slice(0, 6);
    const allResults = [];

    for (const q of queriesToRun) {
      try {
        const results = await searchProvider.search(q, 10);
        allResults.push(...results);
      } catch (err) {
        console.error(`Search error for "${q}":`, err);
      }
    }

    // Deduplicate URLs and sort by score
    const uniqueUrls = new Map<string, number>();
    for (const result of allResults) {
      const existing = uniqueUrls.get(result.url) || 0;
      uniqueUrls.set(result.url, Math.max(existing, result.score));
    }

    // Filter out noise domains but keep social platforms user selected
    const socialSources = ["facebook", "instagram", "linkedin", "tiktok", "x"];
    const selectedSocialDomains = selectedSources
      .filter((s: string) => socialSources.includes(s))
      .flatMap((s: string) => {
        if (s === "x") return ["x.com", "twitter.com"];
        return [`${s}.com`];
      });
    const skipDomains = ["yelp.com", "youtube.com", "reddit.com"];
    const socialDomainList = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "tiktok.com"];
    for (const sd of socialDomainList) {
      if (!selectedSocialDomains.includes(sd)) {
        skipDomains.push(sd);
      }
    }

    const sortedUrls = [...uniqueUrls.entries()]
      .filter(([url]) => !skipDomains.some((d) => url.includes(d)))
      .sort((a, b) => b[1] - a[1])
      .map(([url]) => url);

    // Only take enough URLs to fill the limit — don't over-process
    // Roughly 2-4 leads per page, so take limit/2 URLs + a small buffer
    const urlCount = Math.min(Math.ceil(maxLeads / 2) + 3, sortedUrls.length);
    const urlsToProcess = sortedUrls.slice(skipUrls, skipUrls + urlCount);

    if (urlsToProcess.length === 0) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          totalUrls: 0,
          error: skipUrls > 0
            ? "No more URLs available. Try a different query."
            : "No relevant URLs found for this query",
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: "COMPLETED",
        leads: [],
        leadsCount: 0,
        totalUrlsFound: sortedUrls.length,
        hasMore: false,
      });
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { totalUrls: urlsToProcess.length },
    });

    // Process URLs — scrape in parallel (3 at a time), then extract
    const extractor = createExtractor();
    const allLeads: Array<{
      id: string;
      name: string;
      role: string | null;
      email: string | null;
      linkedin: string | null;
      company: string;
      domain: string;
      sourceUrl: string;
      location: string | null;
      score: number | null;
      scoreReason: string | null;
    }> = [];

    // Track domains — each domain counts as 1 "lead" toward the limit,
    // but ALL people from that domain are returned
    const seenDomains = new Set<string>();
    let companyCount = 0; // counts unique domains toward maxLeads
    function extractDomain(url: string): string {
      try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
    }

    // Scrape all URLs in parallel batches of 3
    const BATCH_SIZE = 3;
    const scrapeResults: Array<{ url: string; text: string; statusCode: number; blocked: boolean; error?: string }> = [];

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
      const batch = urlsToProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((u) => fetchScrapeUrl(u)));

      // Log traces for this batch
      await Promise.all(
        results.map((r) =>
          prisma.traceLog.create({
            data: {
              jobId: job.id,
              sourceUrl: r.url,
              extractionMethod: "fetch",
              robotsRespected: r.robotsRespected,
              statusCode: r.statusCode,
              blocked: r.blocked,
              error: r.error,
            },
          })
        )
      );

      await prisma.job.update({
        where: { id: job.id },
        data: { processedUrls: { increment: batch.length } },
      });

      for (const r of results) {
        if (!r.error && !r.blocked && r.text && r.text.length > 100) {
          scrapeResults.push(r);
        }
      }
    }

    console.log(`[Generate] Scraped ${urlsToProcess.length} URLs, ${scrapeResults.length} usable`);

    // Extract leads from scraped pages — process sequentially (AI calls)
    // Each unique domain = 1 "lead" toward maxLeads, but ALL people from that domain are saved
    for (const scrapeResult of scrapeResults) {
      if (companyCount >= maxLeads) break;

      const domain = extractDomain(scrapeResult.url);
      if (seenDomains.has(domain)) continue;

      try {
        const extractedLeads = await extractor.extract(scrapeResult.text, scrapeResult.url);
        console.log(`[Generate] Extracted ${extractedLeads.length} leads from ${scrapeResult.url.slice(0, 60)}`);

        const validLeads = extractedLeads.filter((l) => l.name && l.company);
        if (validLeads.length === 0) continue;

        seenDomains.add(domain);
        companyCount++;

        // Save ALL people from this domain
        for (const lead of validLeads) {
          // Dedup by name within this job
          const isDup = allLeads.some(
            (l) => l.name.toLowerCase() === lead.name.toLowerCase() &&
                   l.company.toLowerCase() === lead.company.toLowerCase()
          );
          if (isDup) continue;

          const enrichedEmail = await enrichLead(
            lead.name,
            lead.company,
            scrapeResult.url,
            lead.email
          );

          const savedLead = await prisma.lead.create({
            data: {
              name: lead.name,
              role: lead.role,
              email: enrichedEmail,
              linkedin: lead.linkedin,
              company: lead.company,
              sourceUrl: scrapeResult.url,
              location: lead.location || null,
              score: null,
              scoreReason: null,
              jobId: job.id,
            },
          });

          allLeads.push({
            id: savedLead.id,
            name: savedLead.name,
            role: savedLead.role,
            email: savedLead.email,
            linkedin: savedLead.linkedin,
            company: savedLead.company,
            domain,
            sourceUrl: savedLead.sourceUrl,
            location: savedLead.location,
            score: savedLead.score,
            scoreReason: savedLead.scoreReason,
          });
        }
      } catch (err) {
        console.error(`[Generate] Extraction error for ${scrapeResult.url}:`, err);
      }
    }

    // Score each lead deterministically
    function scoreLead(lead: {name: string; role: string | null; email: string | null; linkedin: string | null; company: string}, q: string): {score: number; reason: string} {
      let score = 0;
      const reasons: string[] = [];

      // Decision maker bonus (30 pts)
      const dmTitles = ["ceo", "founder", "owner", "president", "director", "vp", "partner", "managing", "principal", "chairman", "chief"];
      const midTitles = ["manager", "head", "lead", "senior", "supervisor", "coordinator"];
      const roleLower = (lead.role || "").toLowerCase();
      if (dmTitles.some(t => roleLower.includes(t))) { score += 30; reasons.push("Decision maker"); }
      else if (midTitles.some(t => roleLower.includes(t))) { score += 18; reasons.push("Mid-level"); }
      else if (lead.role) { score += 8; reasons.push("Has role"); }

      // Data completeness (20 pts)
      if (lead.email) { score += 10; reasons.push("Has email"); }
      if (lead.linkedin) { score += 5; reasons.push("Has LinkedIn"); }
      if (lead.role) { score += 5; reasons.push("Has title"); }

      // Relevance to query (30 pts)
      const queryTerms = q.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const matchText = `${lead.name} ${lead.role || ""} ${lead.company}`.toLowerCase();
      const matchCount = queryTerms.filter(t => matchText.includes(t)).length;
      const relevance = queryTerms.length > 0 ? Math.round((matchCount / queryTerms.length) * 30) : 15;
      score += relevance;
      if (relevance > 15) reasons.push("Relevant match");

      // Source quality (20 pts) - company page vs directory
      score += 15; // base for being from a scraped page
      if (lead.company && lead.company.length > 2) { score += 5; reasons.push("Named company"); }

      return { score: Math.min(score, 100), reason: reasons.join(", ") };
    }

    // Apply scoring to each lead and update DB records
    for (const lead of allLeads) {
      const { score, reason } = scoreLead(lead, query);
      lead.score = score;
      lead.scoreReason = reason;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { score, scoreReason: reason },
      });
    }

    // Filter out leads below minQuality threshold
    const qualityThreshold = Math.max(0, Math.min(100, Number(minQuality) || 0));
    const filteredLeads = allLeads.filter((l) => (l.score || 0) >= qualityThreshold);

    // Sort by score descending
    filteredLeads.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Mark complete
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const nextOffset = skipUrls + urlCount;
    const hasMore = nextOffset < sortedUrls.length;

    console.log(`[Generate] Job done: ${filteredLeads.length} contacts from ${companyCount} companies for "${query}"`);

    return NextResponse.json({
      jobId: job.id,
      status: "COMPLETED",
      leads: filteredLeads,
      leadsCount: filteredLeads.length,
      companiesCount: companyCount,
      totalUrlsFound: sortedUrls.length,
      processedUrls: urlsToProcess.length,
      offset: skipUrls,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
    });
  } catch (error) {
    console.error("[Generate] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate leads" },
      { status: 500 }
    );
  }
}
