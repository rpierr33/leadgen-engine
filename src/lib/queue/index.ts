import { Queue, Worker, Job as BullJob } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL is required for queue operations");
    }
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export interface ScrapeJobData {
  jobId: string;
  url: string;
  query: string;
  industry?: string;
}

export function getScrapeQueue(): Queue<ScrapeJobData> {
  return new Queue<ScrapeJobData>("scrape", {
    connection: getRedisConnection(),
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
