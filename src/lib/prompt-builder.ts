import { BrandKit } from "@/types";
import { ImageMode } from "@/lib/image-scorer";

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
 * Blocks adapt per imageMode:
 * - hero:       full enforcement — palette, composition, shot type, all signals
 * - supporting: loosen color palette (subject has natural colors); keep render/mood/lighting
 * - broll:      drop shot type / composition specifics; focus on texture, atmosphere, mood
 *
 * Color direction uses descriptive names, NOT hex values.
 * The negative block is mandatory and always fires.
 */
export function buildStructuredBrandPrompt(
  userPrompt: string,
  brandKit: BrandKit,
  imageMode: ImageMode = "hero"
): string {
  // Block 1 — Subject (user's plain-language prompt, unchanged)
  const block1 = userPrompt.trim();

  // Block 2 — Style base (all modes: render style is the primary brand carrier)
  const block2 = [
    `${brandKit.renderStyle} style`,
    brandKit.depthOfField,
    imageMode !== "broll" ? `${brandKit.cameraAngle} camera angle` : null,
    `${brandKit.typographyPersonality} aesthetic`,
  ].filter(Boolean).join(", ");

  // Block 3 — Color direction (mode-adaptive)
  const colorNames = brandKit.colors
    .map((c) => c.descriptiveName)
    .slice(0, 4)
    .join(", ");

  const block3 = imageMode === "hero"
    // Hero: strict palette enforcement across background, environment, and accents
    ? [
        `background and environmental tones: ${colorNames}`,
        `${brandKit.colorTemperature} color temperature`,
        `${brandKit.colorSaturation} saturation`,
        brandKit.colorGrade,
        `subject rendered with natural authentic colors`,
      ].join(", ")
    : imageMode === "supporting"
    // Supporting: ambient palette only — subject (food, objects, people) keeps natural colors
    ? [
        `ambient environment and background tones informed by ${colorNames}`,
        `${brandKit.colorTemperature} color temperature`,
        brandKit.colorGrade,
        `foreground subject colors must be natural and realistic, not tinted`,
      ].join(", ")
    // B-roll: overall color feel and grade only — no palette enforcement
    : [
        `${brandKit.colorTemperature} color temperature`,
        `${brandKit.colorSaturation} saturation`,
        brandKit.colorGrade,
      ].join(", ");

  // Block 4 — Lighting (all modes, but b-roll emphasises atmosphere)
  const block4 = imageMode === "broll"
    ? `${brandKit.lightingStyle}, ${brandKit.lightingTemperature} lighting, emphasise texture and atmospheric depth`
    : `${brandKit.lightingStyle}, ${brandKit.lightingTemperature} lighting`;

  // Block 5 — Composition (hero/supporting enforce shot type; b-roll focuses on texture/detail)
  const block5 = imageMode === "broll"
    ? `close-up texture and detail, ${brandKit.environmentalContext}, abstract or macro composition`
    : [
        `${brandKit.shotType} shot`,
        `${brandKit.negativeSpace} negative space`,
        brandKit.environmentalContext,
        `${brandKit.aspectRatioConvention} composition`,
      ].join(", ");

  // Block 6 — Mood (all modes; b-roll elevates this as its primary brand signal)
  const moodStr = brandKit.moodAdjectives.slice(0, 3).join(", ");
  const block6 = imageMode === "broll"
    ? `strong ${moodStr} mood, atmospheric and evocative`
    : `${moodStr} mood and atmosphere`;

  // Block 7 — Negative block (brand-specific + universal, always fires)
  const brandNegatives = brandKit.prohibitedElements.length > 0
    ? brandKit.prohibitedElements
    : [];
  const allNegatives = Array.from(new Set([...brandNegatives, ...UNIVERSAL_NEGATIVE]));
  const block7 = `Do not include: ${allNegatives.join(", ")}`;

  return [block1, block2, block3, block4, block5, block6, block7].join(". ");
}

/**
 * Returns the 7 prompt blocks as labeled rows for the prompt preview panel.
 * Mirrors buildStructuredBrandPrompt logic — structured for display, not concatenation.
 */
export function getBrandPromptBlocks(
  userPrompt: string,
  brandKit: BrandKit
): Array<{ label: string; value: string }> {
  const colorNames = brandKit.colors.slice(0, 4).map((c) => c.descriptiveName).join(" · ");
  const prohibitedList = Array.from(new Set([...brandKit.prohibitedElements, ...UNIVERSAL_NEGATIVE]));

  return [
    { label: "Subject",     value: userPrompt || "(your prompt)" },
    { label: "Style",       value: `${brandKit.renderStyle}, ${brandKit.depthOfField}, ${brandKit.cameraAngle} angle` },
    { label: "Colors",      value: `${colorNames} — ambient tones, natural subject colors` },
    { label: "Lighting",    value: `${brandKit.lightingStyle}, ${brandKit.lightingTemperature} temperature` },
    { label: "Composition", value: `${brandKit.shotType} shot, ${brandKit.negativeSpace} space, ${brandKit.environmentalContext}` },
    { label: "Mood",        value: brandKit.moodAdjectives.join(" · ") },
    { label: "Grade",       value: brandKit.colorGrade },
    { label: "Avoid",       value: prohibitedList.slice(0, 6).join(" · ") },
  ];
}

/**
 * Builds a targeted alternative prompt that reinforces the failing dimension.
 * Called when the user clicks "Get on-brand version" on a low-scoring image.
 * Reinforcements now reference the full 18-field kit.
 */
export function buildAlternativePrompt(
  userPrompt: string,
  brandKit: BrandKit,
  failingDimension: string | null,
  imageMode: ImageMode = "hero"
): string {
  const base = buildStructuredBrandPrompt(userPrompt, brandKit, imageMode);

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
