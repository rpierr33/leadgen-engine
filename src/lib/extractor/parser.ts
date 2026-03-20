export interface ExtractedLead {
  name: string;
  role: string | null;
  email: string | null;
  linkedin: string | null;
  company: string;
  source_url: string;
}

export function parseLeadsFromLLMOutput(raw: string): ExtractedLead[] {
  // Try to extract JSON from various formats the LLM might return
  let cleaned = raw.trim();

  // Remove markdown fences
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // continue
  }

  // Try to find JSON array in the text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // continue
    }
  }

  // Try to find JSON object in the text
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // continue
    }
  }

  // Try to extract multiple JSON objects
  const objects: ExtractedLead[] = [];
  const regex = /\{[^{}]*\}/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.name) objects.push(obj);
    } catch {
      // skip malformed
    }
  }

  return objects;
}

export function validateLead(lead: ExtractedLead, sourceText: string): ExtractedLead {
  // Validate email exists in source text (never hallucinate)
  if (lead.email && !sourceText.toLowerCase().includes(lead.email.toLowerCase())) {
    lead.email = null;
  }

  // Validate LinkedIn URL format
  if (lead.linkedin && !lead.linkedin.includes("linkedin.com")) {
    lead.linkedin = null;
  }

  // Ensure required fields
  if (!lead.name || !lead.company) {
    throw new Error("Missing required fields: name and company");
  }

  return lead;
}
