import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";
import { getBrandExtractionPrompt, parseBrandKitResponse } from "@/lib/brand-extractor";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

/**
 * Calls screenshotone.com and returns a base64 JPEG string.
 * Returns null on any failure — callers fall through to markdown-only extraction.
 */
async function screenshotUrl(url: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      access_key: process.env.SCREENSHOTONE_API_KEY ?? "",
      url,
      viewport_width: "1440",
      viewport_height: "900",
      format: "jpg",
      image_quality: "80",
      block_ads: "true",
      block_cookie_banners: "true",
      delay: "2",
    });

    const res = await fetch(`https://api.screenshotone.com/take?${params}`);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Run Firecrawl and screenshot in parallel — don't serialize these
    const [scrapeResult, screenshotBase64] = await Promise.all([
      firecrawl.scrapeUrl(url, { formats: ["markdown"] }),
      screenshotUrl(url),
    ]);

    const doc = scrapeResult.data;
    if (!scrapeResult.success || !doc) {
      // Detect common blocked domains and give specific guidance
      const blockedDomains = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com"];
      const isBlockedDomain = blockedDomains.some((d) => url.includes(d));
      const errorMsg = isBlockedDomain
        ? `${new URL(url).hostname} blocks automated access and can't be scraped. Try your brand's main marketing or company website instead (e.g. yourcompany.com).`
        : "We couldn't access this URL — the site may require a login or block automated scrapers. Try your company's public marketing site instead.";
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    const raw = doc.markdown ?? doc.content ?? "";
    const markdown = raw.slice(0, 12000);

    // Build Claude message content conditionally
    // Screenshot comes first so Claude sees visuals before reading text
    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } }
      | { type: "text"; text: string };

    const userContent: ContentBlock[] = [];

    if (screenshotBase64) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: screenshotBase64 },
      });
    }

    userContent.push({
      type: "text",
      text: `Website URL: ${url}\n\nScraped markdown:\n\n${markdown}`,
    });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: getBrandExtractionPrompt(!!screenshotBase64),
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const brandKit = parseBrandKitResponse(rawText);
    brandKit.url = url;

    return NextResponse.json({ brandKit, screenshotAvailable: !!screenshotBase64 });
  } catch (err) {
    console.error("[extract-brand]", err);
    const raw = err instanceof Error ? err.message : "Internal error";
    // Surface Firecrawl auth/quota failures with actionable messaging
    const message = raw.includes("403")
      ? "Could not access this URL. The site may be blocking scrapers, or your Firecrawl credits may be exhausted. Try a different URL or check your Firecrawl dashboard."
      : raw.includes("401") || raw.includes("Unauthorized")
      ? "Firecrawl API key is invalid or expired. Check FIRECRAWL_API_KEY in your environment."
      : raw.includes("400")
      ? "The URL couldn't be processed. Make sure it's a valid, publicly accessible website (e.g. https://yourcompany.com)."
      : raw.includes("429")
      ? "Too many requests — Firecrawl rate limit hit. Wait a moment and try again."
      : raw.includes("ENOTFOUND") || raw.includes("ECONNREFUSED")
      ? "Couldn't reach that URL. Check that the address is correct and the site is publicly accessible."
      : "Something went wrong extracting the brand kit. Try again or use a different URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
