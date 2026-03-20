import { validateMxRecord, inferEmail, extractDomainFromUrl } from "./mx";

interface EnrichmentProvider {
  findEmail(name: string, company: string, domain: string): Promise<string | null>;
}

class PatternEnrichmentProvider implements EnrichmentProvider {
  async findEmail(name: string, _company: string, domain: string): Promise<string | null> {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const candidates = inferEmail(firstName, lastName, domain);

    const hasMx = await validateMxRecord(domain);
    if (!hasMx) return null;

    // Return the most common pattern (first.last@domain)
    return candidates[0] || null;
  }
}

class HunterEnrichmentProvider implements EnrichmentProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async findEmail(name: string, _company: string, domain: string): Promise<string | null> {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    const params = new URLSearchParams({
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: this.apiKey,
    });

    try {
      const response = await fetch(
        `https://api.hunter.io/v2/email-finder?${params}`
      );
      if (!response.ok) return null;

      const data = await response.json();
      return data.data?.email || null;
    } catch {
      return null;
    }
  }
}

export function createEnrichmentProvider(): EnrichmentProvider {
  if (process.env.HUNTER_API_KEY) {
    return new HunterEnrichmentProvider(process.env.HUNTER_API_KEY);
  }
  return new PatternEnrichmentProvider();
}

export async function enrichLead(
  name: string,
  company: string,
  sourceUrl: string,
  existingEmail: string | null
): Promise<string | null> {
  if (existingEmail) return existingEmail;

  const domain = extractDomainFromUrl(sourceUrl);
  if (!domain) return null;

  const provider = createEnrichmentProvider();
  return provider.findEmail(name, company, domain);
}
