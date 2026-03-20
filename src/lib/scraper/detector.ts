const BLOCK_SIGNALS = [
  "captcha",
  "cf-challenge",
  "cloudflare",
  "access denied",
  "403 forbidden",
  "please verify you are a human",
  "checking your browser",
  "ray id",
  "hcaptcha",
  "recaptcha",
  "are you a robot",
];

export function detectBlock(html: string, statusCode?: number): boolean {
  if (statusCode === 403 || statusCode === 429 || statusCode === 503) {
    return true;
  }

  const lowerHtml = html.toLowerCase();
  return BLOCK_SIGNALS.some((signal) => lowerHtml.includes(signal));
}

export function extractTextContent(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Limit to ~8000 chars to stay within LLM context
  return text.slice(0, 8000);
}
