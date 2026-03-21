import { SearchProvider } from "./types";
import { SerperSearchProvider } from "./serper";
import { BraveSearchProvider } from "./brave";

export function createSearchProvider(): SearchProvider {
  if (process.env.SERPER_API_KEY) {
    return new SerperSearchProvider(process.env.SERPER_API_KEY);
  }
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return new BraveSearchProvider(process.env.BRAVE_SEARCH_API_KEY);
  }
  throw new Error(
    "No search provider configured. Set SERPER_API_KEY or BRAVE_SEARCH_API_KEY."
  );
}

export function buildSearchQueries(
  query: string,
  industry?: string,
  mode: "b2b" | "consumer" | "social" = "b2b",
  socialPlatform?: "instagram" | "tiktok" | "x" | "linkedin" | "all"
): string[] {
  const base = industry ? `${query} ${industry}` : query;

  if (mode === "social") {
    const platforms: Record<string, string> = {
      instagram: "site:instagram.com",
      tiktok: "site:tiktok.com",
      x: "site:x.com",
      linkedin: "site:linkedin.com",
    };

    if (socialPlatform && socialPlatform !== "all" && platforms[socialPlatform]) {
      return [
        `${base} ${platforms[socialPlatform]}`,
        `${base} contact ${platforms[socialPlatform]}`,
      ];
    }

    // "all" or unspecified — search all platforms
    return Object.values(platforms).map((site) => `${base} ${site}`);
  }

  if (mode === "consumer") {
    return [
      `${base} directory listing`,
      `${base} reviews professionals`,
      `${base} individual practitioner`,
      `${base} local business listing`,
    ];
  }

  // b2b (default — current behavior)
  return [
    `${base} team page`,
    `${base} about us contact`,
    `${base} leadership founders`,
    `${base} staff directory`,
  ];
}

export { type SearchProvider, type SearchResult } from "./types";
