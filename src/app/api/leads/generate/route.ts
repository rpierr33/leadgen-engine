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
    const { query, industry, limit = 10, offset = 0 } = body;

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
      },
    });

    // Search for URLs
    const searchProvider = createSearchProvider();
    // Only run 2 search queries to save time
    const queries = buildSearchQueries(query, industry).slice(0, 2);
    const allResults = [];

    for (const q of queries) {
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

    // Filter out URLs that won't have people (social media, yelp, etc)
    const skipDomains = ["yelp.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "youtube.com", "tiktok.com", "reddit.com"];

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
      sourceUrl: string;
      score: number | null;
      scoreReason: string | null;
    }> = [];

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
    for (const scrapeResult of scrapeResults) {
      if (allLeads.length >= maxLeads) break;

      try {
        const extractedLeads = await extractor.extract(scrapeResult.text, scrapeResult.url);
        console.log(`[Generate] Extracted ${extractedLeads.length} leads from ${scrapeResult.url.slice(0, 60)}`);

        for (const lead of extractedLeads) {
          if (allLeads.length >= maxLeads) break;
          if (!lead.name || !lead.company) continue;

          // Enrich email
          const enrichedEmail = await enrichLead(
            lead.name,
            lead.company,
            scrapeResult.url,
            lead.email
          );

          // Dedup within batch
          const isDup = allLeads.some(
            (l) =>
              l.name.toLowerCase() === lead.name.toLowerCase() &&
              l.company.toLowerCase() === lead.company.toLowerCase()
          );
          if (isDup) continue;

          // Save
          const savedLead = await prisma.lead.create({
            data: {
              name: lead.name,
              role: lead.role,
              email: enrichedEmail,
              linkedin: lead.linkedin,
              company: lead.company,
              sourceUrl: scrapeResult.url,
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
            sourceUrl: savedLead.sourceUrl,
            score: savedLead.score,
            scoreReason: savedLead.scoreReason,
          });
        }
      } catch (err) {
        console.error(`[Generate] Extraction error for ${scrapeResult.url}:`, err);
      }
    }

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

    console.log(`[Generate] Job done: ${allLeads.length} leads from "${query}"`);

    return NextResponse.json({
      jobId: job.id,
      status: "COMPLETED",
      leads: allLeads,
      leadsCount: allLeads.length,
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
