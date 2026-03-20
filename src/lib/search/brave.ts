import { SearchProvider, SearchResult } from "./types";

export class BraveSearchProvider implements SearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, numResults = 20): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(numResults),
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.web?.results || [];

    return results.map(
      (item: { url: string; title: string; description: string }, index: number) => ({
        url: item.url,
        title: item.title || "",
        snippet: item.description || "",
        score: this.scoreUrl(item.url, numResults - index),
      })
    );
  }

  private scoreUrl(url: string, positionScore: number): number {
    const highValuePaths = [
      "/team", "/about", "/about-us", "/our-team", "/contact",
      "/people", "/leadership", "/founders", "/staff", "/directory",
    ];
    const urlLower = url.toLowerCase();
    const pathBonus = highValuePaths.some((p) => urlLower.includes(p)) ? 50 : 0;
    return positionScore + pathBonus;
  }
}
