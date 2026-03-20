import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { scrapeUrl } from "../src/lib/scraper";
import { createExtractor } from "../src/lib/extractor";
import { enrichLead } from "../src/lib/enrichment";

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("REDIS_URL is required");
  process.exit(1);
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

interface ScrapeJobData {
  jobId: string;
  url: string;
  query: string;
  industry?: string;
}

const extractor = createExtractor();

async function processJob(job: Job<ScrapeJobData>) {
  const { jobId, url, query } = job.data;
  console.log(`[Worker] Processing URL: ${url} for job: ${jobId}`);

  try {
    // Step 1: Scrape
    const scrapeResult = await scrapeUrl(url);

    // Log trace
    await prisma.traceLog.create({
      data: {
        jobId,
        sourceUrl: url,
        extractionMethod: "playwright",
        robotsRespected: scrapeResult.robotsRespected,
        statusCode: scrapeResult.statusCode,
        blocked: scrapeResult.blocked,
        error: scrapeResult.error,
      },
    });

    if (scrapeResult.error || scrapeResult.blocked || !scrapeResult.text) {
      console.log(`[Worker] Skipping ${url}: ${scrapeResult.error || "blocked"}`);
      await incrementProcessedUrls(jobId);
      return;
    }

    // Step 2: Extract leads via LLM
    const extractedLeads = await extractor.extract(scrapeResult.text, url);
    console.log(`[Worker] Extracted ${extractedLeads.length} leads from ${url}`);

    // Step 3: Enrich, deduplicate, and save
    for (const lead of extractedLeads) {
      try {
        // Enrich email
        const enrichedEmail = await enrichLead(
          lead.name,
          lead.company,
          url,
          lead.email
        );

        // Deduplication check
        if (process.env.ENABLE_DEDUPLICATION === "true") {
          const existing = enrichedEmail
            ? await prisma.lead.findFirst({
                where: { email: enrichedEmail, jobId },
              })
            : await prisma.lead.findFirst({
                where: {
                  jobId,
                  name: { equals: lead.name, mode: "insensitive" },
                  company: { equals: lead.company, mode: "insensitive" },
                },
              });

          if (existing) {
            console.log(`[Worker] Duplicate skipped: ${lead.name}`);
            continue;
          }
        }

        // Lead scoring
        let score: number | null = null;
        let scoreReason: string | null = null;

        if (process.env.ENABLE_LEAD_SCORING === "true") {
          const scoreResult = await scoreLead(lead, query);
          score = scoreResult.score;
          scoreReason = scoreResult.reason;
        }

        await prisma.lead.create({
          data: {
            name: lead.name,
            role: lead.role,
            email: enrichedEmail,
            linkedin: lead.linkedin,
            company: lead.company,
            sourceUrl: url,
            score,
            scoreReason,
            jobId,
          },
        });
      } catch (err) {
        console.error(`[Worker] Error saving lead ${lead.name}:`, err);
      }
    }

    await incrementProcessedUrls(jobId);
  } catch (error) {
    console.error(`[Worker] Error processing ${url}:`, error);
    await incrementProcessedUrls(jobId);
    throw error;
  }
}

async function incrementProcessedUrls(jobId: string) {
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { processedUrls: { increment: 1 } },
  });

  // Check if all URLs processed
  if (updatedJob.processedUrls >= updatedJob.totalUrls) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    console.log(`[Worker] Job ${jobId} COMPLETED`);
  }
}

async function scoreLead(
  lead: { name: string; role: string | null; company: string },
  query: string
): Promise<{ score: number; reason: string }> {
  try {
    const prompt = `Score this lead from 0-100 based on relevance to "${query}".
Lead: ${lead.name}, Role: ${lead.role || "unknown"}, Company: ${lead.company}
Return JSON: {"score": number, "reason": "brief explanation"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content.replace(/```json\s*/g, "").replace(/```/g, ""));
    return { score: parsed.score || 50, reason: parsed.reason || "" };
  } catch {
    return { score: 50, reason: "Scoring unavailable" };
  }
}

// Start worker
const worker = new Worker<ScrapeJobData>("scrape", processJob, {
  connection,
  concurrency: 3,
  limiter: {
    max: 10,
    duration: 60000, // 10 jobs per minute
  },
});

worker.on("completed", (job) => {
  console.log(`[Worker] Job task completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job task failed: ${job?.id}`, err.message);
});

// Job completion watcher
async function watchJobs() {
  const POLL_INTERVAL = 5000;
  const HARD_TIMEOUT = 30 * 60 * 1000; // 30 min

  setInterval(async () => {
    try {
      const runningJobs = await prisma.job.findMany({
        where: { status: "RUNNING" },
      });

      for (const job of runningJobs) {
        const elapsed = Date.now() - job.createdAt.getTime();

        if (elapsed > HARD_TIMEOUT) {
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              error: "Hard timeout reached (30 min)",
            },
          });
          console.log(`[Watcher] Job ${job.id} timed out`);
        } else if (job.processedUrls >= job.totalUrls && job.totalUrls > 0) {
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });
          console.log(`[Watcher] Job ${job.id} marked COMPLETED`);
        }
      }
    } catch (err) {
      console.error("[Watcher] Error:", err);
    }
  }, POLL_INTERVAL);
}

watchJobs();
console.log("[Worker] Scrape worker started. Waiting for jobs...");
