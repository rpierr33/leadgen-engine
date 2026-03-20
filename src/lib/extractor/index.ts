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
    const prompt = `Extract all professional contacts from this web page content. Return STRICT JSON array.

Each contact must have:
- "name": full name (string, required)
- "role": job title or role (string or null)
- "email": email address ONLY if it explicitly appears in the text (string or null)
- "linkedin": LinkedIn profile URL ONLY if it explicitly appears (string or null)
- "company": company name (string, required)
- "source_url": "${sourceUrl}"

Rules:
- ONLY include emails that EXPLICITLY appear in the content. Never guess or construct emails.
- If a field is missing, use null.
- Return an empty array [] if no contacts found.
- Return ONLY valid JSON, no explanation.

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

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
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
    const prompt = `Extract all professional contacts from this web page content. Return STRICT JSON array.

Each contact must have:
- "name": full name (string, required)
- "role": job title or role (string or null)
- "email": email address ONLY if explicitly in the text (string or null)
- "linkedin": LinkedIn URL ONLY if explicitly in the text (string or null)
- "company": company name (string, required)
- "source_url": "${sourceUrl}"

Return ONLY valid JSON array, no explanation. Empty array [] if no contacts found.

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
  const provider = process.env.LLM_PROVIDER || "openai";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

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
