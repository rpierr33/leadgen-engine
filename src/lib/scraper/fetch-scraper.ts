import { getRandomUserAgent, getRandomDelay } from "./user-agents";
import { isAllowedByRobots } from "./robots";
import { detectBlock, extractTextContent } from "./detector";

export interface FetchScrapeResult {
  url: string;
  text: string;
  statusCode: number;
  blocked: boolean;
  robotsRespected: boolean;
  error?: string;
}

export async function fetchScrapeUrl(url: string): Promise<FetchScrapeResult> {
  const robotsAllowed = await isAllowedByRobots(url);

  if (!robotsAllowed) {
    return {
      url,
      text: "",
      statusCode: 0,
      blocked: false,
      robotsRespected: true,
      error: "Blocked by robots.txt",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    const statusCode = response.status;
    const html = await response.text();
    const blocked = detectBlock(html, statusCode);

    if (blocked) {
      return {
        url,
        text: "",
        statusCode,
        blocked: true,
        robotsRespected: true,
        error: "Blocked by anti-bot protection",
      };
    }

    const text = extractTextContent(html);

    // Small delay between requests
    const delay = getRandomDelay();
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 500)));

    return {
      url,
      text,
      statusCode,
      blocked: false,
      robotsRespected: true,
    };
  } catch (error) {
    return {
      url,
      text: "",
      statusCode: 0,
      blocked: false,
      robotsRespected: true,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}
