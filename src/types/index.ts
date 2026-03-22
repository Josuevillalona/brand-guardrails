// ─── Brand Kit ────────────────────────────────────────────────────────────────

export interface BrandColor {
  hex: string;
  descriptiveName: string; // e.g. "deep navy blue" — used in prompts, NOT hex
  role: "primary" | "secondary" | "accent" | "background" | "text" | string;
}

export type ColorTemperature = "warm" | "cool" | "neutral";
export type ColorSaturation = "muted" | "vibrant" | "pastel" | "rich";
export type RenderStyle =
  | "photorealistic"
  | "editorial"
  | "flat-vector"
  | "3d-cgi"
  | "illustrated";
export type ShotType =
  | "close-up"
  | "medium"
  | "wide"
  | "overhead"
  | "editorial";
export type NegativeSpace = "airy" | "balanced" | "dense";
export type LightingTemperature = "warm" | "cool" | "neutral";

export interface BrandKit {
  // ── Core 12 fields ──────────────────────────────────────────────────────────
  companyName: string;
  url: string;
  voiceSummary: string;
  colors: BrandColor[];
  colorTemperature: ColorTemperature;
  colorSaturation: ColorSaturation;
  renderStyle: RenderStyle;
  moodAdjectives: string[]; // max 3
  lightingStyle: string;
  lightingTemperature: LightingTemperature;
  shotType: ShotType;
  negativeSpace: NegativeSpace;
  prohibitedElements: string[];

  // ── Extended 6 fields (full 18-field kit) ───────────────────────────────────
  depthOfField: string;        // e.g. "shallow depth of field, f/1.8 bokeh background separation"
  colorGrade: string;          // e.g. "desaturated highlights, warm lifted shadows, low contrast matte"
  environmentalContext: string; // e.g. "minimalist studio with clean architectural details"
  cameraAngle: string;         // e.g. "eye level", "slight low angle conveying authority"
  aspectRatioConvention: string; // e.g. "landscape 16:9", "portrait 4:5 for social"
  typographyPersonality: string; // e.g. "geometric sans-serif", "classic serif editorial"
}

// ─── Brand Score ──────────────────────────────────────────────────────────────

export type BrandLabel = "on-brand" | "needs-review" | "off-brand";

export interface ScoreDimensions {
  colorAlignment: number;     // 0–100, weight 30%
  renderStyleMatch: number;   // 0–100, weight 25%
  moodLighting: number;       // 0–100, weight 20%
  compositionFit: number;     // 0–100, weight 15%
  overallCohesion: number;    // 0–100, weight 10%
  noProhibited: boolean;      // hard override — false = off-brand regardless
}

export interface BrandScore {
  score: number;              // 0–100 weighted aggregate
  label: BrandLabel;
  explanation: string;        // one plain-English sentence
  dimensions: ScoreDimensions;
  failingDimension: keyof Omit<ScoreDimensions, "noProhibited"> | null;
  issues: string[];
  strengths: string[];
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export type CanvasElementType = "text" | "image";

interface CanvasElementBase {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface TextElement extends CanvasElementBase {
  type: "text";
  content: string;
  fontSize: number;
  color: string;
}

export interface ImageElement extends CanvasElementBase {
  type: "image";
  imageUrl: string;
  prompt: string;
  score: BrandScore | null;
  scorePending: boolean;
  overrideReason?: string;    // set when user places an off-brand image with a reason
}

export type CanvasElement = TextElement | ImageElement;

// ─── Generation ───────────────────────────────────────────────────────────────

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;             // full 7-block assembled prompt
  userPrompt: string;         // original plain-language input
  score: BrandScore | null;
  scorePending: boolean;
  noBrandContext?: boolean;   // true when generated without an active Brand Kit
}

// ─── App state ────────────────────────────────────────────────────────────────

export type AppPhase = "home" | "brand-setup" | "canvas";
