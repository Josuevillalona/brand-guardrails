import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";
import { getBrandExtractionPrompt, parseBrandKitResponse } from "@/lib/brand-extractor";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Step 1: Scrape the site into clean markdown via Firecrawl
    const scrapeResult = await firecrawl.scrapeUrl(url, { formats: ["markdown"] });
    const doc = scrapeResult.data;
    if (!scrapeResult.success || !doc) {
      return NextResponse.json(
        { error: "Failed to scrape URL. Check that the site is publicly accessible." },
        { status: 422 }
      );
    }

    // Prefer markdown; fall back to raw content
    const raw = doc.markdown ?? doc.content ?? "";
    // Trim to avoid exceeding context — first 12K chars covers most homepages
    const markdown = raw.slice(0, 12000);

    // Step 2: Extract Brand Kit via Claude
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: getBrandExtractionPrompt(),
      messages: [
        {
          role: "user",
          content: `Website URL: ${url}\n\nScraped content:\n\n${markdown}`,
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const brandKit = parseBrandKitResponse(rawText);
    // Ensure url is set on the kit
    brandKit.url = url;

    return NextResponse.json({ brandKit });
  } catch (err) {
    console.error("[extract-brand]", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
