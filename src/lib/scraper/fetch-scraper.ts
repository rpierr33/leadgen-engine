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

export interface DeepScrapeResult {
  url: string;
  text: string;
  emails: string[];
  phones: string[];
  statusCode: number;
  blocked: boolean;
  robotsRespected: boolean;
  error?: string;
}

const SUB_PAGE_PATTERNS = [
  /\/contact/i,
  /\/about-us/i,
  /\/about/i,
  /\/team/i,
  /\/staff/i,
  /\/people/i,
  /\/our-team/i,
  /\/leadership/i,
  /\/meet-the-team/i,
  /\/meet-our-team/i,
  /\/directory/i,
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const TEL_REGEX = /tel:([\d+\-().  ]+)/gi;

async function fetchPage(
  url: string
): Promise<{ html: string; statusCode: number; blocked: boolean } | null> {
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

    return { html, statusCode, blocked };
  } catch {
    return null;
  }
}

function extractSubPageLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname !== base.hostname) continue;

      const path = resolved.pathname.toLowerCase();
      for (const pattern of SUB_PAGE_PATTERNS) {
        if (pattern.test(path)) {
          links.push(resolved.href);
          break;
        }
      }
    } catch {
      // skip invalid URLs
    }
  }

  // Deduplicate
  return [...new Set(links)];
}

function extractEmails(html: string): string[] {
  const fromBody = html.match(EMAIL_REGEX) || [];
  const fromMailto: string[] = [];
  let match;
  while ((match = MAILTO_REGEX.exec(html)) !== null) {
    fromMailto.push(match[1]);
  }
  return [...new Set([...fromBody, ...fromMailto])];
}

function extractPhones(html: string): string[] {
  const fromBody = html.match(PHONE_REGEX) || [];
  const fromTel: string[] = [];
  let match;
  while ((match = TEL_REGEX.exec(html)) !== null) {
    fromTel.push(match[1].trim());
  }
  return [...new Set([...fromBody, ...fromTel])];
}

export async function scrapeCompanyDeep(url: string): Promise<DeepScrapeResult> {
  const robotsAllowed = await isAllowedByRobots(url);

  if (!robotsAllowed) {
    return {
      url,
      text: "",
      emails: [],
      phones: [],
      statusCode: 0,
      blocked: false,
      robotsRespected: true,
      error: "Blocked by robots.txt",
    };
  }

  const mainResult = await fetchPage(url);

  if (!mainResult) {
    return {
      url,
      text: "",
      emails: [],
      phones: [],
      statusCode: 0,
      blocked: false,
      robotsRespected: true,
      error: "Fetch failed",
    };
  }

  if (mainResult.blocked) {
    return {
      url,
      text: "",
      emails: [],
      phones: [],
      statusCode: mainResult.statusCode,
      blocked: true,
      robotsRespected: true,
      error: "Blocked by anti-bot protection",
    };
  }

  const allHtml = [mainResult.html];
  const mainText = extractTextContent(mainResult.html);
  const allTexts = [mainText];

  // Find sub-page links and fetch up to 2
  const subLinks = extractSubPageLinks(mainResult.html, url).slice(0, 2);

  for (const subLink of subLinks) {
    const delay = getRandomDelay();
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 500)));

    const subAllowed = await isAllowedByRobots(subLink);
    if (!subAllowed) continue;

    const subResult = await fetchPage(subLink);
    if (subResult && !subResult.blocked) {
      allHtml.push(subResult.html);
      allTexts.push(extractTextContent(subResult.html));
    }
  }

  const combinedHtml = allHtml.join("\n");
  const combinedText = allTexts.join("\n\n");

  const emails = extractEmails(combinedHtml);
  const phones = extractPhones(combinedHtml);

  // Small delay after scraping
  const delay = getRandomDelay();
  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 500)));

  return {
    url,
    text: combinedText,
    emails,
    phones,
    statusCode: mainResult.statusCode,
    blocked: false,
    robotsRespected: true,
  };
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
