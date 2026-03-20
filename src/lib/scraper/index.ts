import { chromium } from "playwright";
import { getRandomUserAgent, getRandomDelay } from "./user-agents";
import { isAllowedByRobots } from "./robots";
import { detectBlock, extractTextContent } from "./detector";

export interface ScrapeResult {
  url: string;
  text: string;
  statusCode: number;
  blocked: boolean;
  robotsRespected: boolean;
  error?: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
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

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    // Stealth overrides
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
      // @ts-expect-error chrome property
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const statusCode = response?.status() || 0;
    const html = await page.content();
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

    // Random delay between requests
    await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

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
      error: error instanceof Error ? error.message : "Unknown scraping error",
    };
  } finally {
    await browser.close();
  }
}
