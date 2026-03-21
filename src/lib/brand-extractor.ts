import { BrandKit } from "@/types";

/**
 * Returns the Claude system prompt for brand extraction.
 * When a screenshot is available, Claude is instructed to read visual signals from pixels,
 * not from copy. When markdown-only, falls back to text inference.
 */
export function getBrandExtractionPrompt(hasScreenshot: boolean): string {
  const visualInstructions = hasScreenshot
    ? `You will receive a SCREENSHOT of the website homepage and its scraped MARKDOWN text.

IMPORTANT — source partitioning:
- Read ALL visual signals from the SCREENSHOT only:
  colors (sample actual hex values from rendered pixels), render style, lighting character,
  shot type conventions in photography, color temperature, saturation level, negative space usage,
  depth of field in imagery, color grading / post-processing treatment, camera angles used,
  environmental contexts shown, typography personality (geometric/serif/humanist etc.).
- Read these fields from the MARKDOWN only:
  companyName, voiceSummary, prohibitedElements (inferred from messaging/positioning), company context.
- Do NOT infer visual signals from copy. If the copy says "bold and modern", ignore it for color/style.
  Look at what the site actually renders.`
    : `You will receive scraped MARKDOWN text from a company website.
Infer all brand signals analytically from copy tone, product descriptions, and design language cues in the text.`;

  return `You are a brand analyst extracting a structured Brand Kit for use in AI image generation.
${visualInstructions}

Return ONLY valid JSON matching this exact schema. No markdown fences, no explanation, just the JSON object.

Schema:
{
  "companyName": "string",
  "url": "string (the source URL)",
  "voiceSummary": "string (1-2 sentences describing brand voice and personality)",
  "colors": [
    {
      "hex": "#RRGGBB",
      "descriptiveName": "string (e.g. 'deep navy blue with cool undertones' — evocative, goes directly into image generation prompts)",
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
  "prohibitedElements": ["string"],
  "depthOfField": "string (e.g. 'shallow depth of field, f/1.8 bokeh background separation' or 'deep focus, everything sharp')",
  "colorGrade": "string (e.g. 'desaturated highlights, warm lifted shadows, low contrast matte finish' or 'clean neutral grade, no stylization')",
  "environmentalContext": "string (e.g. 'minimalist studio with clean architectural details', 'outdoor natural setting', 'modern office environment')",
  "cameraAngle": "string (e.g. 'eye level', 'slight low angle conveying authority', 'straight-on neutral')",
  "aspectRatioConvention": "string (e.g. 'landscape 16:9', 'portrait 4:5 for social media', 'square 1:1')",
  "typographyPersonality": "string (e.g. 'geometric sans-serif with tight tracking', 'classic serif editorial', 'humanist sans warm and approachable')"
}

Rules:
- colors: 3–6 entries. descriptiveName MUST be evocative and model-friendly ("rich emerald green", not "#2ECC71").
- moodAdjectives: exactly 3 adjectives, brand-appropriate.
- prohibitedElements: at least 3 specific off-brand items. Use brand-specific rules if evident;
  otherwise sensible defaults (e.g. "competing brand logos", "dark gothic imagery", "childish cartoon characters").
- depthOfField: be specific with photographic language — this directly removes the AI-generated flatness.
- colorGrade: describe the post-processing treatment precisely — this prevents DALL-E oversaturation.
- If you cannot confidently determine a field, make a reasonable brand-appropriate default.`;
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

  // Defaults for extended fields if extraction didn't produce them
  if (!parsed.depthOfField) parsed.depthOfField = "shallow depth of field, natural bokeh background separation";
  if (!parsed.colorGrade) parsed.colorGrade = "clean neutral color grade, natural tones";
  if (!parsed.environmentalContext) parsed.environmentalContext = "clean professional environment";
  if (!parsed.cameraAngle) parsed.cameraAngle = "eye level, straight-on";
  if (!parsed.aspectRatioConvention) parsed.aspectRatioConvention = "landscape 16:9";
  if (!parsed.typographyPersonality) parsed.typographyPersonality = "clean modern sans-serif";

  return parsed as BrandKit;
}
