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

export type LeadSource =
  | "web"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "x"
  | "healthgrades"
  | "vitals"
  | "ahca"
  | "bbb";

export function buildSearchQueries(
  query: string,
  industry?: string,
  sources: LeadSource[] = ["web"],
): string[] {
  const base = industry ? `${query} ${industry}` : query;
  const queries: string[] = [];

  for (const source of sources) {
    switch (source) {
      case "web":
        queries.push(
          `${base} team page`,
          `${base} about us contact`,
          `${base} leadership founders`,
        );
        break;

      case "facebook":
        queries.push(`${base} site:facebook.com`);
        break;

      case "instagram":
        queries.push(`${base} site:instagram.com`);
        break;

      case "linkedin":
        queries.push(`${base} site:linkedin.com/company`);
        break;

      case "tiktok":
        queries.push(`${base} site:tiktok.com`);
        break;

      case "x":
        queries.push(`${base} site:x.com OR site:twitter.com`);
        break;

      case "healthgrades":
        queries.push(
          `${base} site:healthgrades.com`,
          `${base} provider site:healthgrades.com`,
        );
        break;

      case "vitals":
        queries.push(`${base} site:vitals.com`);
        break;

      case "ahca":
        queries.push(
          `${base} site:floridahealthfinder.gov`,
          `${base} florida licensed provider`,
        );
        break;

      case "bbb":
        queries.push(`${base} site:bbb.org`);
        break;
    }
  }

  return [...new Set(queries)];
}

export { type SearchProvider, type SearchResult } from "./types";
