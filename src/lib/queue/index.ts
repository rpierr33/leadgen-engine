import { Queue, Worker, Job as BullJob } from "bullmq";

export interface ScrapeJobData {
  jobId: string;
  url: string;
  query: string;
  industry?: string;
}

export function getScrapeQueue() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for queue operations");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Queue("scrape", {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null,
    } as any,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  });
}

export { Queue, Worker, BullJob };
