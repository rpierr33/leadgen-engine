// Only flag as blocked when the page is ACTUALLY a block/challenge page,
// not just because it happens to use Cloudflare CDN.
// We look for challenge-specific patterns, not generic CDN references.

const BLOCK_PATTERNS = [
  // Actual Cloudflare challenge pages (not just CDN usage)
  "cf-challenge-running",
  "cf-challenge-error",
  "cf_chl_opt",
  "managed_checking_msg",
  "checking your browser before accessing",
  "this process is automatic. your browser will redirect",
  // CAPTCHA
  "hcaptcha-box",
  "g-recaptcha",
  "recaptcha/api",
  "hcaptcha.com/1/api",
  "please verify you are a human",
  "are you a robot",
  "verify you are human",
  "complete the security check",
  // Explicit denial pages (short body = likely a block page)
  "access denied",
  "403 forbidden",
];

export function detectBlock(html: string, statusCode?: number): boolean {
  // 429 = rate limited, always blocked
  if (statusCode === 429) return true;

  // 403 could be legit (e.g., some sites return 403 for non-logged-in users
  // but still serve content). Only flag if body is very short.
  if (statusCode === 403 && html.length < 5000) return true;

  // 503 with challenge page
  if (statusCode === 503 && html.length < 10000) {
    const lower = html.toLowerCase();
    if (lower.includes("cf-challenge") || lower.includes("checking your browser")) {
      return true;
    }
  }

  // Check for challenge/CAPTCHA patterns in the visible body
  // Strip scripts/styles first so we don't match on CDN references in JS
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[0] : html;

  // Remove script and style content to avoid false positives from CDN JS references
  const cleanedBody = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .toLowerCase();

  // Only flag if the page body is suspiciously short AND contains block signals
  // A real website with content won't be flagged even if it uses Cloudflare
  if (cleanedBody.length < 3000) {
    return BLOCK_PATTERNS.some((pattern) => cleanedBody.includes(pattern));
  }

  // For longer pages, only flag on very specific challenge indicators
  const hardBlockSignals = [
    "cf-challenge-running",
    "cf_chl_opt",
    "hcaptcha-box",
    "g-recaptcha",
    "please verify you are a human",
  ];
  return hardBlockSignals.some((signal) => cleanedBody.includes(signal));
}

export function extractTextContent(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Keep nav and footer — they often contain contact info, team links
  // Remove sidebars and ads
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Limit to ~12000 chars for better extraction
  return text.slice(0, 12000);
}
