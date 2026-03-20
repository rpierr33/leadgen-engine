import "dotenv/config";

const url = "https://www.dentistsoffortlauderdale.com/meet-our-team/";

console.log("1. Fetching:", url);
const res = await fetch(url, {
  headers: {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
});
const html = await res.text();
console.log("   Status:", res.status, "| HTML length:", html.length);

// Extract text
let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
text = text.replace(/<aside[\s\S]*?<\/aside>/gi, "");
text = text.replace(/<[^>]+>/g, " ");
text = text.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'");
text = text.replace(/\s+/g, " ").trim().slice(0, 12000);
console.log("2. Text length:", text.length);
console.log("   Preview:", text.slice(0, 400));

console.log("\n3. Sending to OpenAI...");
const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + process.env.OPENAI_API_KEY,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      {role: "system", content: "You are a data extraction assistant. Return only valid JSON arrays."},
      {role: "user", content: `You are extracting PEOPLE from a business web page. Find every person mentioned. Return JSON array. Each: {"name": "full name", "role": "title", "email": null, "linkedin": null, "company": "Dentists of Fort Lauderdale", "source_url": "${url}"}. Include ALL people. Return ONLY JSON.\n\nContent:\n${text}`}
    ],
    temperature: 0.1,
    max_tokens: 2000,
  }),
});
const data = await aiRes.json();
console.log("   AI status:", aiRes.status);
if (data.error) {
  console.log("   ERROR:", JSON.stringify(data.error));
} else {
  console.log("   Result:", data.choices?.[0]?.message?.content);
}
