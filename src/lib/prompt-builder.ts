import { BrandKit } from "@/types";

// Universal quality exclusions — fire on every call regardless of brand rules
const UNIVERSAL_NEGATIVE = [
  "stock photo staging",
  "lens flare",
  "HDR over-processing",
  "clip art",
  "watermark",
  "blurry",
  "low quality",
  "pixelated",
  "oversaturated",
  "generic corporate imagery",
];

/**
 * Assembles a 7-block structured prompt in canonical order:
 * Subject → Style base → Color direction → Lighting → Composition → Mood → Negative block
 *
 * Color direction uses descriptive names (e.g. "deep navy blue"), NOT hex values.
 * The negative block is mandatory and always fires.
 */
export function buildStructuredBrandPrompt(
  userPrompt: string,
  brandKit: BrandKit
): string {
  // Block 1 — Subject (user's plain-language prompt, unchanged)
  const block1 = userPrompt.trim();

  // Block 2 — Style base
  const block2 = `${brandKit.renderStyle} style, professional quality, high detail`;

  // Block 3 — Color direction (descriptive names + temperature + saturation — never hex)
  const colorNames = brandKit.colors
    .map((c) => c.descriptiveName)
    .slice(0, 4)
    .join(", ");
  const block3 = `color palette featuring ${colorNames}, ${brandKit.colorTemperature} color temperature, ${brandKit.colorSaturation} saturation`;

  // Block 4 — Lighting
  const block4 = `${brandKit.lightingStyle}, ${brandKit.lightingTemperature} lighting`;

  // Block 5 — Composition
  const block5 = `${brandKit.shotType} shot, ${brandKit.negativeSpace} negative space, clean composition`;

  // Block 6 — Mood
  const moodStr = brandKit.moodAdjectives.slice(0, 3).join(", ");
  const block6 = `${moodStr} mood and atmosphere`;

  // Block 7 — Negative block (brand-specific + universal)
  const brandNegatives = brandKit.prohibitedElements.length > 0
    ? brandKit.prohibitedElements
    : [];
  const allNegatives = Array.from(new Set([...brandNegatives, ...UNIVERSAL_NEGATIVE]));
  const block7 = `--no ${allNegatives.join(", ")}`;

  return [block1, block2, block3, block4, block5, block6, block7].join(". ");
}

/**
 * Builds a targeted alternative prompt that reinforces the failing dimension.
 * Called when the user clicks "Get on-brand version" on a low-scoring image.
 */
export function buildAlternativePrompt(
  userPrompt: string,
  brandKit: BrandKit,
  failingDimension: string | null
): string {
  const base = buildStructuredBrandPrompt(userPrompt, brandKit);

  if (!failingDimension) return base;

  const reinforcements: Record<string, string> = {
    colorAlignment: `strictly adhering to brand colors ${brandKit.colors.map((c) => c.descriptiveName).join(" and ")}, no off-palette colors`,
    renderStyleMatch: `strongly ${brandKit.renderStyle} visual style, consistent artistic medium throughout`,
    moodLighting: `${brandKit.moodAdjectives.join(", ")} emotional tone, ${brandKit.lightingStyle}`,
    compositionFit: `${brandKit.shotType} framing, ${brandKit.negativeSpace} negative space, centered composition`,
    overallCohesion: `cohesive brand identity, unified visual language, consistent aesthetic throughout`,
  };

  const extra = reinforcements[failingDimension];
  if (!extra) return base;

  // Insert reinforcement before the negative block
  const parts = base.split(". --no ");
  return `${parts[0]}, ${extra}. --no ${parts[1]}`;
}
