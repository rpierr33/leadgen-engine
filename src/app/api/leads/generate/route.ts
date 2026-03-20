import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSearchProvider, buildSearchQueries } from "@/lib/search";
import { getScrapeQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, industry } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        query,
        industry: industry || null,
        status: "PENDING",
      },
    });

    // Search for URLs
    const searchProvider = createSearchProvider();
    const queries = buildSearchQueries(query, industry);
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

    const sortedUrls = [...uniqueUrls.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // Max 20 URLs per job
      .map(([url]) => url);

    if (sortedUrls.length === 0) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          error: "No relevant URLs found",
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: "COMPLETED",
        message: "No relevant URLs found for this query",
        urlCount: 0,
      });
    }

    // Update job with URL count
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        totalUrls: sortedUrls.length,
      },
    });

    // Queue URLs for scraping
    const queue = getScrapeQueue();
    for (const url of sortedUrls) {
      await queue.add("scrape-url", {
        jobId: job.id,
        url,
        query,
        industry,
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: "RUNNING",
      urlCount: sortedUrls.length,
      urls: sortedUrls,
    });
  } catch (error) {
    console.error("Generate leads error:", error);
    return NextResponse.json(
      { error: "Failed to start lead generation" },
      { status: 500 }
    );
  }
}
