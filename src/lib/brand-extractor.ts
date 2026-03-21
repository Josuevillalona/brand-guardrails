import { BrandKit } from "@/types";

/**
 * Returns the Claude system prompt for brand extraction.
 * Claude receives Firecrawl markdown and must return a valid BrandKit JSON.
 */
export function getBrandExtractionPrompt(): string {
  return `You are a brand analyst. You will receive the scraped markdown content of a company website.
Extract a structured Brand Kit JSON object. Be analytical and precise — infer from visual descriptions,
copy tone, product imagery descriptions, and design language cues in the text.

Return ONLY valid JSON matching this exact schema. No markdown, no explanation, just the JSON object.

Schema:
{
  "companyName": "string",
  "url": "string (the source URL)",
  "voiceSummary": "string (1-2 sentences describing brand voice and personality)",
  "colors": [
    {
      "hex": "#RRGGBB",
      "descriptiveName": "string (e.g. 'deep navy blue with cool undertones' — be descriptive, this goes into image prompts)",
      "role": "primary|secondary|accent|background|text"
    }
  ],
  "colorTemperature": "warm|cool|neutral",
  "colorSaturation": "muted|vibrant|pastel|rich",
  "renderStyle": "photorealistic|editorial|flat-vector|3d-cgi|illustrated",
  "moodAdjectives": ["string", "string", "string"],
  "lightingStyle": "string (e.g. 'soft natural window light', 'studio three-point', 'golden hour outdoor')",
  "lightingTemperature": "warm|cool|neutral",
  "shotType": "close-up|medium|wide|overhead|editorial",
  "negativeSpace": "airy|balanced|dense",
  "prohibitedElements": ["string"]
}

Rules:
- colors: 3–6 entries. descriptiveName MUST be evocative and model-friendly (e.g. "rich emerald green" not "#2ECC71").
- moodAdjectives: exactly 3 adjectives, brand-appropriate.
- prohibitedElements: always include at least 3 specific items that would be off-brand
  (e.g. "competing brand logos", "dark gothic imagery", "childish cartoon characters").
  If no brand-specific rules are evident, use universal sensible defaults.
- renderStyle: infer from the site's visual language — tech companies tend toward clean/editorial,
  consumer brands toward photorealistic, startups toward flat-vector or illustrated.
- If you cannot confidently infer a field, make a reasonable brand-appropriate default.`;
}

/**
 * Parses Claude's raw text response into a BrandKit.
 * Handles cases where Claude wraps JSON in markdown code fences.
 */
export function parseBrandKitResponse(raw: string): BrandKit {
  // Strip markdown code fences if present
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(json);

  // Validate required fields and apply defaults
  if (!parsed.prohibitedElements || parsed.prohibitedElements.length === 0) {
    parsed.prohibitedElements = [
      "competing brand logos",
      "dark or gothic imagery",
      "stock photo clichés",
    ];
  }

  if (!parsed.moodAdjectives || parsed.moodAdjectives.length === 0) {
    parsed.moodAdjectives = ["professional", "clean", "approachable"];
  }

  // Ensure max 3 mood adjectives
  parsed.moodAdjectives = parsed.moodAdjectives.slice(0, 3);

  return parsed as BrandKit;
}
