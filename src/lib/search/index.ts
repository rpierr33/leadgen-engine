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

// Available sources users can select (multi-select checkboxes)
export const LEAD_SOURCES = {
  web: {
    label: "Web (Team & About Pages)",
    description: "Company websites, staff directories",
    alwaysAvailable: true,
  },
  social: {
    label: "Social Media",
    description: "Facebook, Instagram, LinkedIn business pages",
    alwaysAvailable: true,
  },
  healthgrades: {
    label: "Healthgrades",
    description: "Doctor & provider directory",
    industries: ["Healthcare"],
  },
  vitals: {
    label: "Vitals",
    description: "Healthcare provider ratings & directory",
    industries: ["Healthcare"],
  },
  ahca: {
    label: "FL Health Finder (AHCA)",
    description: "Florida licensed facility search (cached)",
    industries: ["Healthcare"],
  },
  bbb: {
    label: "Better Business Bureau",
    description: "Accredited business directory",
    alwaysAvailable: true,
  },
} as const;

export type LeadSource = keyof typeof LEAD_SOURCES;

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

      case "social":
        queries.push(
          `${base} site:facebook.com`,
          `${base} site:instagram.com`,
          `${base} site:linkedin.com/company`,
        );
        break;

      case "healthgrades":
        queries.push(
          `${base} site:healthgrades.com`,
          `${base} provider site:healthgrades.com`,
        );
        break;

      case "vitals":
        queries.push(
          `${base} site:vitals.com`,
        );
        break;

      case "ahca":
        queries.push(
          `${base} site:floridahealthfinder.gov`,
          `${base} florida licensed provider`,
          `${base} AHCA license florida`,
        );
        break;

      case "bbb":
        queries.push(
          `${base} site:bbb.org`,
        );
        break;
    }
  }

  // Deduplicate
  return [...new Set(queries)];
}

export { type SearchProvider, type SearchResult } from "./types";
