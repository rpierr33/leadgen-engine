import { SearchProvider, SearchResult } from "./types";

export class SerperSearchProvider implements SearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, numResults = 20): Promise<SearchResult[]> {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: numResults }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    const organic = data.organic || [];

    return organic.map((item: { link: string; title: string; snippet: string }, index: number) => ({
      url: item.link,
      title: item.title || "",
      snippet: item.snippet || "",
      score: this.scoreUrl(item.link, numResults - index),
    }));
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
