import robotsParser from "robots-parser";

const robotsCache = new Map<string, { allowed: boolean; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function isAllowedByRobots(url: string): Promise<boolean> {
  if (process.env.RESPECT_ROBOTS_TXT !== "true") return true;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const cached = robotsCache.get(hostname);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.allowed;
    }

    const robotsUrl = `${urlObj.protocol}//${hostname}/robots.txt`;
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      robotsCache.set(hostname, { allowed: true, timestamp: Date.now() });
      return true;
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);
    const allowed = robots.isAllowed(url, "*") ?? true;

    robotsCache.set(hostname, { allowed, timestamp: Date.now() });
    return allowed;
  } catch {
    return true;
  }
}
