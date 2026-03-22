import {
  buildStructuredBrandPrompt,
  buildAlternativePrompt,
  getBrandPromptBlocks,
} from "@/lib/prompt-builder";
import { BrandKit } from "@/types";

const mockBrandKit: BrandKit = {
  companyName: "Acme Corp",
  url: "https://acme.com",
  colors: [
    { hex: "#1A2B3C", descriptiveName: "Deep Navy", role: "primary" },
    { hex: "#F5E6D3", descriptiveName: "Warm Sand", role: "secondary" },
  ],
  colorTemperature: "warm",
  colorSaturation: "medium",
  renderStyle: "photorealistic",
  moodAdjectives: ["bold", "clean", "modern"],
  lightingStyle: "natural soft",
  lightingTemperature: "warm",
  shotType: "wide",
  negativeSpace: "generous",
  depthOfField: "shallow",
  cameraAngle: "eye-level",
  colorGrade: "filmic",
  environmentalContext: "urban outdoors",
  aspectRatioConvention: "landscape",
  typographyPersonality: "geometric sans",
  prohibitedElements: ["text overlays", "dark backgrounds"],
};

describe("buildStructuredBrandPrompt", () => {
  it("includes the user prompt as block 1", () => {
    const result = buildStructuredBrandPrompt("a coffee cup on a table", mockBrandKit);
    expect(result).toMatch(/^a coffee cup on a table/);
  });

  it("includes render style in block 2", () => {
    const result = buildStructuredBrandPrompt("prompt", mockBrandKit);
    expect(result).toContain("photorealistic style");
  });

  it("includes descriptive color names (not hex) in hero mode", () => {
    const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "hero");
    expect(result).toContain("Deep Navy");
    expect(result).toContain("Warm Sand");
    expect(result).not.toContain("#1A2B3C");
  });

  it("includes lighting block", () => {
    const result = buildStructuredBrandPrompt("prompt", mockBrandKit);
    expect(result).toContain("natural soft");
    expect(result).toContain("warm lighting");
  });

  it("always includes the negative block with prohibited elements", () => {
    const result = buildStructuredBrandPrompt("prompt", mockBrandKit);
    expect(result).toContain("Do not include:");
    expect(result).toContain("text overlays");
    expect(result).toContain("dark backgrounds");
  });

  it("always includes universal quality exclusions in negative block", () => {
    const result = buildStructuredBrandPrompt("prompt", mockBrandKit);
    expect(result).toContain("watermark");
    expect(result).toContain("low quality");
  });

  it("deduplicates negative terms", () => {
    const kit = { ...mockBrandKit, prohibitedElements: ["watermark"] };
    const result = buildStructuredBrandPrompt("prompt", kit);
    const count = (result.match(/watermark/g) || []).length;
    expect(count).toBe(1);
  });

  describe("hero mode", () => {
    it("enforces background and environmental palette tones", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "hero");
      expect(result).toContain("background and environmental tones");
    });

    it("includes shot type", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "hero");
      expect(result).toContain("wide shot");
    });
  });

  describe("supporting mode", () => {
    it("uses ambient palette language, not strict enforcement", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "supporting");
      expect(result).toContain("ambient environment");
      expect(result).not.toContain("background and environmental tones:");
    });

    it("instructs natural foreground subject colors", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "supporting");
      expect(result).toContain("natural and realistic");
    });
  });

  describe("broll mode", () => {
    it("omits explicit palette color names", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "broll");
      expect(result).not.toContain("Deep Navy");
    });

    it("emphasises texture and atmosphere", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "broll");
      expect(result).toContain("texture");
      expect(result).toContain("atmospheric");
    });

    it("omits camera angle from block 2", () => {
      const result = buildStructuredBrandPrompt("prompt", mockBrandKit, "broll");
      expect(result).not.toContain("eye-level camera angle");
    });
  });
});

describe("buildAlternativePrompt", () => {
  it("returns the base prompt when no failing dimension", () => {
    const base = buildStructuredBrandPrompt("prompt", mockBrandKit);
    const alt = buildAlternativePrompt("prompt", mockBrandKit, null);
    expect(alt).toBe(base);
  });

  it("inserts color reinforcement for colorAlignment failure", () => {
    const result = buildAlternativePrompt("prompt", mockBrandKit, "colorAlignment");
    expect(result).toContain("strictly adhering to brand colors");
    expect(result).toContain("Deep Navy");
  });

  it("inserts render style reinforcement for renderStyleMatch failure", () => {
    const result = buildAlternativePrompt("prompt", mockBrandKit, "renderStyleMatch");
    expect(result).toContain("strongly photorealistic visual style");
  });

  it("inserts mood/lighting reinforcement for moodLighting failure", () => {
    const result = buildAlternativePrompt("prompt", mockBrandKit, "moodLighting");
    expect(result).toContain("bold, clean, modern emotional tone");
  });

  it("inserts composition reinforcement for compositionFit failure", () => {
    const result = buildAlternativePrompt("prompt", mockBrandKit, "compositionFit");
    expect(result).toContain("wide framing");
  });

  it("still contains the negative block after reinforcement", () => {
    const result = buildAlternativePrompt("prompt", mockBrandKit, "colorAlignment");
    expect(result).toContain("Do not include:");
    expect(result).toContain("text overlays");
  });

  it("returns base prompt for unknown dimension", () => {
    const base = buildStructuredBrandPrompt("prompt", mockBrandKit);
    const alt = buildAlternativePrompt("prompt", mockBrandKit, "unknownDimension");
    expect(alt).toBe(base);
  });
});

describe("getBrandPromptBlocks", () => {
  it("returns 8 labeled blocks", () => {
    const blocks = getBrandPromptBlocks("prompt", mockBrandKit);
    expect(blocks).toHaveLength(8);
  });

  it("first block is Subject with user prompt", () => {
    const blocks = getBrandPromptBlocks("my prompt", mockBrandKit);
    expect(blocks[0].label).toBe("Subject");
    expect(blocks[0].value).toBe("my prompt");
  });

  it("fallback subject is (your prompt) when empty", () => {
    const blocks = getBrandPromptBlocks("", mockBrandKit);
    expect(blocks[0].value).toBe("(your prompt)");
  });

  it("Avoid block contains prohibited elements and universal negatives", () => {
    const blocks = getBrandPromptBlocks("prompt", mockBrandKit);
    const avoidBlock = blocks.find((b) => b.label === "Avoid");
    expect(avoidBlock?.value).toContain("text overlays");
    expect(avoidBlock?.value).toContain("watermark");
  });

  it("Colors block contains descriptive names joined with ·", () => {
    const blocks = getBrandPromptBlocks("prompt", mockBrandKit);
    const colorsBlock = blocks.find((b) => b.label === "Colors");
    expect(colorsBlock?.value).toContain("Deep Navy");
    expect(colorsBlock?.value).toContain("Warm Sand");
    expect(colorsBlock?.value).toContain("·");
  });
});
