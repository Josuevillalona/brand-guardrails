import { BrandKit } from "@/types";

// Universal quality exclusions — fire on every call regardless of brand rules
const UNIVERSAL_NEGATIVE = [
  "stock photo clichés",
  "lens flare",
  "clip art",
  "watermark",
  "low quality",
  "pixelated",
  "generic corporate imagery",
];

/**
 * Assembles a 7-block structured prompt in canonical order:
 * Subject → Style base → Color direction → Lighting → Composition → Mood → Negative block
 *
 * Full 18-field Brand Kit integrated:
 * - Block 2: renderStyle + depthOfField + cameraAngle + typographyPersonality aesthetic
 * - Block 3: colors + colorTemperature + colorSaturation + colorGrade
 * - Block 5: shotType + negativeSpace + environmentalContext + aspectRatioConvention
 *
 * Color direction uses descriptive names, NOT hex values.
 * The negative block is mandatory and always fires.
 */
export function buildStructuredBrandPrompt(
  userPrompt: string,
  brandKit: BrandKit
): string {
  // Block 1 — Subject (user's plain-language prompt, unchanged)
  const block1 = userPrompt.trim();

  // Block 2 — Style base
  // Uses photography-specific language instead of "professional quality, high detail"
  // which is a known DALL-E over-render trigger
  const block2 = [
    `${brandKit.renderStyle} style`,
    brandKit.depthOfField,
    `${brandKit.cameraAngle} camera angle`,
    `${brandKit.typographyPersonality} aesthetic`,
  ].join(", ");

  // Block 3 — Color direction
  // Scoped to environment, background, and accent elements — NOT the subject itself.
  // This prevents DALL-E applying brand palette to subject matter (e.g. charcoal-colored avocados).
  const colorNames = brandKit.colors
    .map((c) => c.descriptiveName)
    .slice(0, 4)
    .join(", ");
  const block3 = [
    `background and environmental tones: ${colorNames}`,
    `${brandKit.colorTemperature} color temperature`,
    `${brandKit.colorSaturation} saturation`,
    brandKit.colorGrade,
    `subject rendered with natural authentic colors`,
  ].join(", ");

  // Block 4 — Lighting
  const block4 = `${brandKit.lightingStyle}, ${brandKit.lightingTemperature} lighting`;

  // Block 5 — Composition (shot type + negative space + environment + aspect ratio)
  const block5 = [
    `${brandKit.shotType} shot`,
    `${brandKit.negativeSpace} negative space`,
    brandKit.environmentalContext,
    `${brandKit.aspectRatioConvention} composition`,
  ].join(", ");

  // Block 6 — Mood
  const moodStr = brandKit.moodAdjectives.slice(0, 3).join(", ");
  const block6 = `${moodStr} mood and atmosphere`;

  // Block 7 — Negative block (brand-specific + universal)
  // DALL-E 3 uses natural language — no Midjourney-style --no syntax
  const brandNegatives = brandKit.prohibitedElements.length > 0
    ? brandKit.prohibitedElements
    : [];
  const allNegatives = Array.from(new Set([...brandNegatives, ...UNIVERSAL_NEGATIVE]));
  const block7 = `Do not include: ${allNegatives.join(", ")}`;

  return [block1, block2, block3, block4, block5, block6, block7].join(". ");
}

/**
 * Builds a targeted alternative prompt that reinforces the failing dimension.
 * Called when the user clicks "Get on-brand version" on a low-scoring image.
 * Reinforcements now reference the full 18-field kit.
 */
export function buildAlternativePrompt(
  userPrompt: string,
  brandKit: BrandKit,
  failingDimension: string | null
): string {
  const base = buildStructuredBrandPrompt(userPrompt, brandKit);

  if (!failingDimension) return base;

  const reinforcements: Record<string, string> = {
    colorAlignment: [
      `strictly adhering to brand colors ${brandKit.colors.map((c) => c.descriptiveName).join(" and ")}`,
      `no off-palette colors`,
      brandKit.colorGrade,
    ].join(", "),
    renderStyleMatch: [
      `strongly ${brandKit.renderStyle} visual style`,
      `consistent artistic medium throughout`,
      brandKit.depthOfField,
      `${brandKit.cameraAngle} angle`,
    ].join(", "),
    moodLighting: [
      `${brandKit.moodAdjectives.join(", ")} emotional tone`,
      brandKit.lightingStyle,
      `${brandKit.environmentalContext}`,
    ].join(", "),
    compositionFit: [
      `${brandKit.shotType} framing`,
      `${brandKit.negativeSpace} negative space`,
      brandKit.environmentalContext,
      brandKit.aspectRatioConvention,
    ].join(", "),
    overallCohesion: `cohesive brand identity, unified visual language, consistent aesthetic throughout, ${brandKit.typographyPersonality} aesthetic register`,
  };

  const extra = reinforcements[failingDimension];
  if (!extra) return base;

  // Insert reinforcement before the negative block
  const parts = base.split(". Do not include: ");
  return `${parts[0]}, ${extra}. Do not include: ${parts[1]}`;
}
