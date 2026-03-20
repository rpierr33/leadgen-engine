import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "playwright",
    "playwright-extra",
    "crawlee",
    "ioredis",
    "bullmq",
  ],
};

export default nextConfig;
