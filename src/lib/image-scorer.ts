import { BrandKit, BrandScore, ScoreDimensions } from "@/types";

// Dimension weights (must sum to 1.0 across weighted dimensions)
const WEIGHTS = {
  colorAlignment: 0.30,
  renderStyleMatch: 0.25,
  moodLighting: 0.20,
  compositionFit: 0.15,
  overallCohesion: 0.10,
};

/**
 * Returns the Claude vision scoring prompt.
 * Claude receives the image (as base64 or URL) and the Brand Kit, and must return BrandScore JSON.
 */
export function getScoringPrompt(brandKit: BrandKit): string {
  const colorNames = brandKit.colors.map((c) => c.descriptiveName).join(", ");
  const prohibited = brandKit.prohibitedElements.join(", ");

  return `You are a brand compliance evaluator. Analyze this image against the provided Brand Kit and return a JSON score.

Brand Kit:
- Company: ${brandKit.companyName}
- Voice: ${brandKit.voiceSummary}
- Colors: ${colorNames}
- Color temperature: ${brandKit.colorTemperature}, saturation: ${brandKit.colorSaturation}
- Render style: ${brandKit.renderStyle}
- Mood: ${brandKit.moodAdjectives.join(", ")}
- Lighting: ${brandKit.lightingStyle} (${brandKit.lightingTemperature})
- Shot type: ${brandKit.shotType}, negative space: ${brandKit.negativeSpace}
- Prohibited elements: ${prohibited}

Return ONLY valid JSON matching this exact schema. No markdown, no explanation.

{
  "score": number (0-100, weighted aggregate — see weights below),
  "label": "on-brand|needs-review|off-brand",
  "explanation": "string (one sentence identifying the primary compliance or drift reason)",
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
- noProhibited: false if you detect ANY element from the prohibited list → label MUST be "off-brand" regardless of other scores.
- Dimension weights: colorAlignment 30%, renderStyleMatch 25%, moodLighting 20%, compositionFit 15%, overallCohesion 10%.
- score = weighted average of the 5 numeric dimensions (ignore noProhibited in math, but override label if false).
- label thresholds: score >= 80 → "on-brand", score >= 50 → "needs-review", score < 50 → "off-brand".
- failingDimension: the single lowest-scoring numeric dimension (null if all >= 70).
- issues: 1–3 specific issues identified. Empty array if score >= 80.
- strengths: 1–3 specific things the image does well.`;
}

/**
 * Parses Claude's raw scoring response into a BrandScore.
 */
export function parseScoringResponse(raw: string): BrandScore {
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(json) as BrandScore;

  // Enforce hard override: noProhibited = false always means off-brand
  if (parsed.dimensions.noProhibited === false) {
    parsed.label = "off-brand";
  }

  // Recalculate weighted score server-side to avoid trusting model math
  const d = parsed.dimensions;
  const weighted =
    d.colorAlignment * WEIGHTS.colorAlignment +
    d.renderStyleMatch * WEIGHTS.renderStyleMatch +
    d.moodLighting * WEIGHTS.moodLighting +
    d.compositionFit * WEIGHTS.compositionFit +
    d.overallCohesion * WEIGHTS.overallCohesion;

  parsed.score = Math.round(weighted);

  // Re-apply label thresholds (unless hard override already set it)
  if (parsed.dimensions.noProhibited !== false) {
    if (parsed.score >= 80) parsed.label = "on-brand";
    else if (parsed.score >= 50) parsed.label = "needs-review";
    else parsed.label = "off-brand";
  }

  return parsed;
}

/**
 * Determines the single worst-performing dimension for targeted alternative generation.
 */
export function getFailingDimension(
  dimensions: ScoreDimensions
): keyof Omit<ScoreDimensions, "noProhibited"> | null {
  const scored: [keyof Omit<ScoreDimensions, "noProhibited">, number][] = [
    ["colorAlignment", dimensions.colorAlignment],
    ["renderStyleMatch", dimensions.renderStyleMatch],
    ["moodLighting", dimensions.moodLighting],
    ["compositionFit", dimensions.compositionFit],
    ["overallCohesion", dimensions.overallCohesion],
  ];

  const worst = scored.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
  return worst[1] < 70 ? worst[0] : null;
}
