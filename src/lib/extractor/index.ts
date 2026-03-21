import { ExtractedLead, parseLeadsFromLLMOutput, validateLead } from "./parser";

interface LLMProvider {
  extract(text: string, sourceUrl: string): Promise<ExtractedLead[]>;
}

class OpenAIExtractor implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extract(text: string, sourceUrl: string): Promise<ExtractedLead[]> {
    // Derive company name from URL
    let companyHint = "";
    try {
      companyHint = new URL(sourceUrl).hostname.replace("www.", "").split(".")[0];
      companyHint = companyHint.charAt(0).toUpperCase() + companyHint.slice(1);
    } catch { /* ignore */ }

    const prompt = `You are extracting PEOPLE from a business web page. Find every person mentioned — staff, team members, founders, doctors, executives, partners, agents, etc.

Return a JSON array. Every person you find MUST be included, even if they only have a name.

Each object:
- "name": full name WITHOUT credentials (e.g. "Daynet Fraga" not "Daynet Fraga, D.M.D.") (REQUIRED)
- "role": their job title, position, or credential like "Dentist (D.M.D.)", "CEO", "Founder", "Licensed Agent" (string or null)
- "email": email ONLY if it explicitly appears in the text (string or null — never guess)
- "linkedin": LinkedIn URL ONLY if explicitly in the text (string or null)
- "company": the business name from the page, or "${companyHint}" if unclear (REQUIRED)
- "location": city/state/country if mentioned on the page (string or null)
- "source_url": "${sourceUrl}"

IMPORTANT:
- Include ALL people found, even if they have no email or LinkedIn.
- A person with just a name and role is still a valid lead.
- If a field is missing, use null.
- Return ONLY valid JSON array, no text before or after.

Content:
${text}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Return only valid JSON arrays.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Extractor] OpenAI error:", JSON.stringify(data));
      throw new Error(`OpenAI API error: ${response.status} - ${data?.error?.message || JSON.stringify(data)}`);
    }

    const content = data.choices?.[0]?.message?.content || "[]";
    const leads = parseLeadsFromLLMOutput(content);

    return leads
      .map((lead) => {
        try {
          return validateLead(lead, text);
        } catch {
          return null;
        }
      })
      .filter((l): l is ExtractedLead => l !== null);
  }
}

class OllamaExtractor implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async extract(text: string, sourceUrl: string): Promise<ExtractedLead[]> {
    let companyHint = "";
    try {
      companyHint = new URL(sourceUrl).hostname.replace("www.", "").split(".")[0];
      companyHint = companyHint.charAt(0).toUpperCase() + companyHint.slice(1);
    } catch { /* ignore */ }

    const prompt = `Extract every person mentioned on this page — staff, team, founders, doctors, etc. Return JSON array. Include people even if they only have a name.

Each: {"name": string, "role": string|null, "email": string|null (only if in text), "linkedin": string|null (only if in text), "company": "${companyHint}", "location": string|null (city/state/country if mentioned), "source_url": "${sourceUrl}"}

Return ONLY valid JSON array.

Content:
${text}`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.response || "[]";
    const leads = parseLeadsFromLLMOutput(content);

    return leads
      .map((lead) => {
        try {
          return validateLead(lead, text);
        } catch {
          return null;
        }
      })
      .filter((l): l is ExtractedLead => l !== null);
  }
}

export function createExtractor(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || "openai").trim();
  const model = (process.env.LLM_MODEL || "gpt-4o-mini").trim();

  if (provider === "ollama") {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    return new OllamaExtractor(baseUrl, model);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
  }
  return new OpenAIExtractor(apiKey, model);
}

export { type ExtractedLead } from "./parser";
