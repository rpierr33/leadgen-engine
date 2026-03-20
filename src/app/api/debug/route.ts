import { NextResponse } from "next/server";
import { fetchScrapeUrl } from "@/lib/scraper/fetch-scraper";
import { createExtractor } from "@/lib/extractor";

export const maxDuration = 60;

export async function GET() {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  try {
    const testUrl = "https://www.dentistsoffortlauderdale.com/meet-our-team/";

    log("1. Scraping: " + testUrl);
    const result = await fetchScrapeUrl(testUrl);
    log(`   Status: ${result.statusCode} | Blocked: ${result.blocked} | Error: ${result.error || "none"} | Text length: ${result.text.length}`);
    log(`   Text preview: ${result.text.slice(0, 300)}`);

    if (result.text.length > 100) {
      log("2. OPENAI_API_KEY set: " + (!!process.env.OPENAI_API_KEY) + " | length: " + (process.env.OPENAI_API_KEY?.length || 0));
      log("   LLM_PROVIDER: " + (process.env.LLM_PROVIDER || "not set") + " | LLM_MODEL: " + (process.env.LLM_MODEL || "not set"));
      log("3. Extracting with AI...");
      const extractor = createExtractor();
      const leads = await extractor.extract(result.text, testUrl);
      log(`   Extracted ${leads.length} leads`);
      for (const l of leads) {
        log(`   - ${l.name} | ${l.role} | ${l.company}`);
      }
      return NextResponse.json({ success: true, logs, leads });
    } else {
      log("   Text too short, skipping extraction");
      return NextResponse.json({ success: false, logs, text: result.text });
    }
  } catch (err) {
    log("ERROR: " + (err instanceof Error ? err.message + "\n" + err.stack : String(err)));
    return NextResponse.json({ success: false, logs });
  }
}
