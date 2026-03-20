export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchProvider {
  search(query: string, numResults?: number): Promise<SearchResult[]>;
}
