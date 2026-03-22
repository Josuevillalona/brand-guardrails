import { BrandKit, BrandScore, ScoreDimensions } from "@/types";

export type ImageMode = "hero" | "supporting" | "broll";

// Weights shift by mode. Hero enforces full brand signal suite.
// Supporting/broll relax color palette (subject has natural colors)
// and elevate render style + mood — the signals that carry aesthetic cohesion.
const WEIGHTS: Record<ImageMode, Record<keyof Omit<ScoreDimensions, "noProhibited">, number>> = {
  hero: {
    colorAlignment:  0.30,
    renderStyleMatch: 0.25,
    moodLighting:    0.20,
    compositionFit:  0.15,
    overallCohesion: 0.10,
  },
  supporting: {
    colorAlignment:  0.15, // ambient palette — subject has natural colors
    renderStyleMatch: 0.30,
    moodLighting:    0.30,
    compositionFit:  0.15,
    overallCohesion: 0.10,
  },
  broll: {
    colorAlignment:  0.10,
    renderStyleMatch: 0.30,
    moodLighting:    0.35, // atmosphere is the primary brand carrier for b-roll
    compositionFit:  0.15,
    overallCohesion: 0.10,
  },
};

const MODE_INSTRUCTIONS: Record<ImageMode, string> = {
  hero: `This is a HERO image — full brand signal enforcement applies.
Evaluate all dimensions strictly: color palette, render style, mood, composition, and narrative cohesion.
overallCohesion: evaluate whether the image as a whole — subject, treatment, and aesthetic — feels like it belongs to this brand.`,

  supporting: `This is a SUPPORTING image (contextual content — people, food, lifestyle, objects, environments).
IMPORTANT: The user deliberately chose this subject matter. Do not penalize subject choice.
- colorAlignment: evaluate only the environment, background, and accent tones. Subjects — including people, their skin tones, hair, and clothing — have natural colors. Do NOT penalize for this.
- overallCohesion: evaluate AESTHETIC cohesion only — does the lighting, grade, render style, and atmosphere feel like this brand? Do NOT evaluate narrative or content strategy fit.
- explanation: reference only aesthetic signals (lighting, grade, render style, atmosphere). Do not mention subject matter mismatch.`,

  broll: `This is a B-ROLL image (texture, detail, abstract, atmospheric).
IMPORTANT: The user deliberately chose this subject matter. Do not penalize subject choice.
- colorAlignment: evaluate only ambient color feel and environment tones. Very low weight.
- overallCohesion: evaluate AESTHETIC cohesion only — lighting character, color grade, render feel. Ignore narrative fit entirely.
- explanation: reference only the visual/aesthetic signals. Never comment on whether the subject matches the brand story.`,
};

const MODE_WEIGHT_DISPLAY: Record<ImageMode, string> = {
  hero:       "colorAlignment 30%, renderStyleMatch 25%, moodLighting 20%, compositionFit 15%, overallCohesion 10%",
  supporting: "colorAlignment 15%, renderStyleMatch 30%, moodLighting 30%, compositionFit 15%, overallCohesion 10%",
  broll:      "colorAlignment 10%, renderStyleMatch 30%, moodLighting 35%, compositionFit 15%, overallCohesion 10%",
};

export function getScoringPrompt(
  brandKit: BrandKit,
  userPrompt: string,
  imageMode: ImageMode
): string {
  const colorNames = brandKit.colors.map((c) => c.descriptiveName).join(", ");
  const prohibited = brandKit.prohibitedElements.join(", ");

  return `You are a brand compliance evaluator. Analyze this image against the provided Brand Kit and return a JSON score.

User intent: "${userPrompt}"
Image mode: ${imageMode.toUpperCase()}
${MODE_INSTRUCTIONS[imageMode]}

Brand Kit:
- Company: ${brandKit.companyName}
- Colors: ${colorNames}
- Color temperature: ${brandKit.colorTemperature}, saturation: ${brandKit.colorSaturation}
- Color grade: ${brandKit.colorGrade}
- Render style: ${brandKit.renderStyle}
- Depth of field: ${brandKit.depthOfField}
- Mood: ${brandKit.moodAdjectives.join(", ")}
- Lighting: ${brandKit.lightingStyle} (${brandKit.lightingTemperature})
- Shot type: ${brandKit.shotType}, camera angle: ${brandKit.cameraAngle}
- Environment: ${brandKit.environmentalContext}
- Prohibited elements: ${prohibited}

Return ONLY valid JSON matching this exact schema. No markdown, no explanation.

{
  "score": number (0-100 weighted aggregate),
  "label": "on-brand|needs-review|off-brand",
  "explanation": "string (one sentence — aesthetic signals only for supporting/broll modes)",
  "dimensions": {
    "colorAlignment": number (0-100),
    "renderStyleMatch": number (0-100),
    "moodLighting": number (0-100),
    "compositionFit": number (0-100),
    "overallCohesion": number (0-100),
    "noProhibited": boolean
  },
  "failingDimension": "colorAlignment|renderStyleMatch|moodLighting|compositionFit|overallCohesion|null",
  "issues": ["string"],
  "strengths": ["string"]
}

Scoring rules:
- noProhibited: false ONLY if a prohibited element is explicitly and unambiguously visible — a legible logo, identifiable brand mark, or clearly depicted banned object. Do NOT set noProhibited: false based on color similarity alone (e.g. pink tones ≠ a competitor's logo). When uncertain, keep noProhibited: true. A false negative is better than a false positive here.
- noProhibited: false → label MUST be "off-brand" regardless of other scores.
- Dimension weights for ${imageMode} mode: ${MODE_WEIGHT_DISPLAY[imageMode]}.
- score = weighted average using those weights.
- label thresholds: score >= 80 → "on-brand", score >= 50 → "needs-review", score < 50 → "off-brand".
- failingDimension: the lowest-scoring numeric dimension (null if all >= 70).
- issues: 1–3 specific issues. Empty array if score >= 80.
- strengths: 1–3 specific things the image does well.

Score calibration — use the FULL 0–100 range:
- 85–100: exceptional brand alignment across all relevant dimensions
- 70–84: strong alignment with minor drift in one dimension
- 55–69: genuine partial failure — one or more dimensions clearly off
- 40–54: significant drift across multiple dimensions
- 0–39: fundamentally misaligned or prohibited element detected
Reserve 50–65 for genuine partial failures, not uncertainty. If the render style, lighting, and color grade are correct, the image should score 75+ even if one secondary dimension is imperfect.`;
}

export function parseScoringResponse(raw: string, imageMode: ImageMode): BrandScore {
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(json) as BrandScore;

  // Hard override: noProhibited = false always means off-brand
  if (parsed.dimensions.noProhibited === false) {
    parsed.label = "off-brand";
  }

  // Recalculate weighted score server-side using the correct mode weights
  const w = WEIGHTS[imageMode];
  const d = parsed.dimensions;
  const weighted =
    d.colorAlignment  * w.colorAlignment +
    d.renderStyleMatch * w.renderStyleMatch +
    d.moodLighting    * w.moodLighting +
    d.compositionFit  * w.compositionFit +
    d.overallCohesion * w.overallCohesion;

  parsed.score = Math.round(weighted);

  if (parsed.dimensions.noProhibited !== false) {
    if (parsed.score >= 80) parsed.label = "on-brand";
    else if (parsed.score >= 50) parsed.label = "needs-review";
    else parsed.label = "off-brand";
  }

  return parsed;
}

export function getFailingDimension(
  dimensions: ScoreDimensions
): keyof Omit<ScoreDimensions, "noProhibited"> | null {
  const scored: [keyof Omit<ScoreDimensions, "noProhibited">, number][] = [
    ["colorAlignment",  dimensions.colorAlignment],
    ["renderStyleMatch", dimensions.renderStyleMatch],
    ["moodLighting",    dimensions.moodLighting],
    ["compositionFit",  dimensions.compositionFit],
    ["overallCohesion", dimensions.overallCohesion],
  ];
  const worst = scored.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
  return worst[1] < 70 ? worst[0] : null;
}
