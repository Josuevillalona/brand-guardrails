import { parseScoringResponse, getFailingDimension, getScoringPrompt } from "@/lib/image-scorer";
import { BrandKit, BrandScore, ScoreDimensions } from "@/types";

const mockBrandKit: BrandKit = {
  companyName: "Acme Corp",
  url: "https://acme.com",
  voiceSummary: "Bold and confident tone.",
  colors: [{ hex: "#1A2B3C", descriptiveName: "Deep Navy", role: "primary" }],
  colorTemperature: "warm",
  colorSaturation: "muted",
  renderStyle: "photorealistic",
  moodAdjectives: ["bold", "clean"],
  lightingStyle: "natural soft",
  lightingTemperature: "warm",
  shotType: "wide",
  negativeSpace: "airy",
  depthOfField: "shallow",
  cameraAngle: "eye-level",
  colorGrade: "filmic",
  environmentalContext: "urban outdoors",
  aspectRatioConvention: "landscape",
  typographyPersonality: "geometric sans",
  prohibitedElements: ["text overlays"],
};

const baseDimensions: ScoreDimensions = {
  colorAlignment: 85,
  renderStyleMatch: 80,
  moodLighting: 75,
  compositionFit: 70,
  overallCohesion: 80,
  noProhibited: true,
};

function makeRawResponse(overrides: Partial<BrandScore> = {}): string {
  const score: BrandScore = {
    score: 80,
    label: "on-brand",
    explanation: "Good match",
    dimensions: { ...baseDimensions },
    failingDimension: null,
    issues: [],
    strengths: ["Good lighting"],
    ...overrides,
  };
  return JSON.stringify(score);
}

describe("parseScoringResponse", () => {
  it("parses valid JSON correctly", () => {
    const result = parseScoringResponse(makeRawResponse(), "hero");
    expect(result.explanation).toBe("Good match");
    expect(result.strengths).toEqual(["Good lighting"]);
  });

  it("strips markdown code fences before parsing", () => {
    const raw = "```json\n" + makeRawResponse() + "\n```";
    const result = parseScoringResponse(raw, "hero");
    expect(result.explanation).toBe("Good match");
  });

  it("recalculates weighted score for hero mode", () => {
    const raw = makeRawResponse({
      dimensions: { ...baseDimensions, colorAlignment: 100, renderStyleMatch: 100, moodLighting: 100, compositionFit: 100, overallCohesion: 100 },
    });
    const result = parseScoringResponse(raw, "hero");
    expect(result.score).toBe(100);
  });

  it("recalculates differently for broll mode (moodLighting 35%)", () => {
    const dims: ScoreDimensions = {
      colorAlignment: 0,
      renderStyleMatch: 0,
      moodLighting: 100,
      compositionFit: 0,
      overallCohesion: 0,
      noProhibited: true,
    };
    const raw = makeRawResponse({ dimensions: dims });
    const result = parseScoringResponse(raw, "broll");
    expect(result.score).toBe(35); // 100 * 0.35
  });

  it("hard overrides label to off-brand when noProhibited is false", () => {
    const raw = makeRawResponse({
      score: 90,
      label: "on-brand",
      dimensions: { ...baseDimensions, noProhibited: false },
    });
    const result = parseScoringResponse(raw, "hero");
    expect(result.label).toBe("off-brand");
  });

  it("assigns on-brand label when score >= 80 and no prohibited", () => {
    const dims: ScoreDimensions = { ...baseDimensions, colorAlignment: 100, renderStyleMatch: 100, moodLighting: 100, compositionFit: 100, overallCohesion: 100 };
    const raw = makeRawResponse({ dimensions: dims });
    const result = parseScoringResponse(raw, "hero");
    expect(result.label).toBe("on-brand");
  });

  it("assigns needs-review when score 50–79", () => {
    const dims: ScoreDimensions = { ...baseDimensions, colorAlignment: 50, renderStyleMatch: 50, moodLighting: 50, compositionFit: 50, overallCohesion: 50 };
    const raw = makeRawResponse({ dimensions: dims });
    const result = parseScoringResponse(raw, "hero");
    expect(result.label).toBe("needs-review");
    expect(result.score).toBe(50);
  });

  it("assigns off-brand when score < 50", () => {
    const dims: ScoreDimensions = { ...baseDimensions, colorAlignment: 20, renderStyleMatch: 20, moodLighting: 20, compositionFit: 20, overallCohesion: 20 };
    const raw = makeRawResponse({ dimensions: dims });
    const result = parseScoringResponse(raw, "hero");
    expect(result.label).toBe("off-brand");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseScoringResponse("not json", "hero")).toThrow();
  });
});

describe("getFailingDimension", () => {
  it("returns null when all dimensions are >= 70", () => {
    const result = getFailingDimension(baseDimensions);
    expect(result).toBeNull();
  });

  it("returns the lowest scoring dimension when below 70", () => {
    const dims: ScoreDimensions = { ...baseDimensions, colorAlignment: 40 };
    expect(getFailingDimension(dims)).toBe("colorAlignment");
  });

  it("returns the single worst dimension among multiple below 70", () => {
    const dims: ScoreDimensions = { ...baseDimensions, colorAlignment: 60, moodLighting: 45 };
    expect(getFailingDimension(dims)).toBe("moodLighting");
  });

  it("returns null when worst dimension is exactly 70", () => {
    const dims: ScoreDimensions = { ...baseDimensions, compositionFit: 70 };
    expect(getFailingDimension(dims)).toBeNull();
  });
});

describe("getScoringPrompt", () => {
  it("includes company name from brand kit", () => {
    const prompt = getScoringPrompt(mockBrandKit, "a coffee cup", "hero");
    expect(prompt).toContain("Acme Corp");
  });

  it("includes user intent", () => {
    const prompt = getScoringPrompt(mockBrandKit, "a coffee cup", "hero");
    expect(prompt).toContain("a coffee cup");
  });

  it("includes mode name in prompt", () => {
    const prompt = getScoringPrompt(mockBrandKit, "prompt", "broll");
    expect(prompt).toContain("BROLL");
  });

  it("includes prohibited elements", () => {
    const prompt = getScoringPrompt(mockBrandKit, "prompt", "hero");
    expect(prompt).toContain("text overlays");
  });

  it("includes scoring weights for the given mode", () => {
    const heroPrompt = getScoringPrompt(mockBrandKit, "prompt", "hero");
    expect(heroPrompt).toContain("colorAlignment 30%");

    const brollPrompt = getScoringPrompt(mockBrandKit, "prompt", "broll");
    expect(brollPrompt).toContain("moodLighting 35%");
  });

  it("instructs return of valid JSON schema", () => {
    const prompt = getScoringPrompt(mockBrandKit, "prompt", "hero");
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"label"');
    expect(prompt).toContain('"dimensions"');
  });
});
