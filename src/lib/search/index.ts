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

export function buildSearchQueries(query: string, industry?: string): string[] {
  const base = industry ? `${query} ${industry}` : query;
  return [
    `${base} team page`,
    `${base} about us contact`,
    `${base} leadership founders`,
    `${base} staff directory`,
  ];
}

export { type SearchProvider, type SearchResult } from "./types";
