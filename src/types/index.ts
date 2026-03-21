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
  companyName: string;
  url: string;
  voiceSummary: string;
  colors: BrandColor[];
  colorTemperature: ColorTemperature;
  colorSaturation: ColorSaturation;
  renderStyle: RenderStyle;
  moodAdjectives: string[]; // max 3
  lightingStyle: string; // e.g. "soft natural window light"
  lightingTemperature: LightingTemperature;
  shotType: ShotType;
  negativeSpace: NegativeSpace;
  prohibitedElements: string[]; // always populated — minimum universal defaults
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
}

// ─── App state ────────────────────────────────────────────────────────────────

export type AppPhase = "brand-setup" | "canvas";
