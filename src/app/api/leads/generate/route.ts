import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSearchProvider, buildSearchQueries } from "@/lib/search";
import { fetchScrapeUrl } from "@/lib/scraper/fetch-scraper";
import { createExtractor } from "@/lib/extractor";
import { enrichLead } from "@/lib/enrichment";

export const maxDuration = 300; // 5 min max for Vercel (Pro) or self-hosted

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, industry, limit = 20, offset = 0 } = body;

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
    const queries = buildSearchQueries(query, industry);
    const allResults = [];

    for (const q of queries) {
      try {
        const results = await searchProvider.search(q, 15);
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

    const sortedUrls = [...uniqueUrls.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([url]) => url);

    // Apply offset — skip URLs already processed in previous batches
    const urlsToProcess = sortedUrls.slice(skipUrls, skipUrls + maxLeads + 10);

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
        message: skipUrls > 0
          ? "No more URLs to process for this query"
          : "No relevant URLs found",
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

    // Process URLs inline — scrape, extract, enrich, save
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

    for (const url of urlsToProcess) {
      // Stop once we have enough leads
      if (allLeads.length >= maxLeads) break;

      try {
        // Scrape
        const scrapeResult = await fetchScrapeUrl(url);

        // Trace log
        await prisma.traceLog.create({
          data: {
            jobId: job.id,
            sourceUrl: url,
            extractionMethod: "fetch",
            robotsRespected: scrapeResult.robotsRespected,
            statusCode: scrapeResult.statusCode,
            blocked: scrapeResult.blocked,
            error: scrapeResult.error,
          },
        });

        await prisma.job.update({
          where: { id: job.id },
          data: { processedUrls: { increment: 1 } },
        });

        if (scrapeResult.error || scrapeResult.blocked || !scrapeResult.text) {
          continue;
        }

        // Extract with AI
        const extractedLeads = await extractor.extract(scrapeResult.text, url);

        for (const lead of extractedLeads) {
          if (allLeads.length >= maxLeads) break;

          // Enrich email
          const enrichedEmail = await enrichLead(
            lead.name,
            lead.company,
            url,
            lead.email
          );

          // Dedup check within this batch
          if (process.env.ENABLE_DEDUPLICATION === "true") {
            const isDup = enrichedEmail
              ? allLeads.some(
                  (l) => l.email?.toLowerCase() === enrichedEmail.toLowerCase()
                )
              : allLeads.some(
                  (l) =>
                    l.name.toLowerCase() === lead.name.toLowerCase() &&
                    l.company.toLowerCase() === lead.company.toLowerCase()
                );
            if (isDup) continue;
          }

          // Save to DB
          const savedLead = await prisma.lead.create({
            data: {
              name: lead.name,
              role: lead.role,
              email: enrichedEmail,
              linkedin: lead.linkedin,
              company: lead.company,
              sourceUrl: url,
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
        console.error(`Error processing ${url}:`, err);
      }
    }

    // Mark job complete
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const nextOffset = skipUrls + urlsToProcess.length;
    const hasMore = nextOffset < sortedUrls.length;

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
    console.error("Generate leads error:", error);
    return NextResponse.json(
      { error: "Failed to generate leads" },
      { status: 500 }
    );
  }
}
