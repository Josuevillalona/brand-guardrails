import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrandKitReveal } from "@/components/brand-setup/BrandKitReveal";
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

// Fully revealed: high enough count so all items are visible
const FULL_REVEAL = 999;

describe("BrandKitReveal", () => {
  it("renders company name when revealed", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
  });

  it("calls onUpdate with new company name on blur", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    const input = screen.getByDisplayValue("Acme Corp");
    fireEvent.change(input, { target: { value: "New Corp" } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ companyName: "New Corp" }));
  });

  it("renders color descriptive names", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByDisplayValue("Deep Navy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Warm Sand")).toBeInTheDocument();
  });

  it("calls onUpdate when color name is changed", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    const input = screen.getByDisplayValue("Deep Navy");
    fireEvent.change(input, { target: { value: "Midnight Blue" } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        colors: expect.arrayContaining([
          expect.objectContaining({ descriptiveName: "Midnight Blue" }),
        ]),
      })
    );
  });

  it("renders prohibited elements as pills", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByText("text overlays")).toBeInTheDocument();
    expect(screen.getByText("dark backgrounds")).toBeInTheDocument();
  });

  it("removes a prohibited element when × is clicked", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    // The prohibited pill for "text overlays" contains a × button — click it
    const pill = screen.getByText("text overlays").closest("span")!;
    const removeBtn = pill.querySelector("button")!;
    fireEvent.click(removeBtn);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        prohibitedElements: ["dark backgrounds"],
      })
    );
  });

  it("adds a new prohibited element on Enter", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    const addInput = screen.getByPlaceholderText("+ Add");
    fireEvent.change(addInput, { target: { value: "busy backgrounds" } });
    fireEvent.keyDown(addInput, { key: "Enter" });
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        prohibitedElements: ["text overlays", "dark backgrounds", "busy backgrounds"],
      })
    );
  });

  it("renders voice summary textarea", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={{ ...mockBrandKit, voiceSummary: "Bold and direct tone." }}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByDisplayValue("Bold and direct tone.")).toBeInTheDocument();
  });

  it("calls onUpdate when voice summary changes", () => {
    const onUpdate = jest.fn();
    render(
      <BrandKitReveal
        brandKit={{ ...mockBrandKit, voiceSummary: "Bold tone." }}
        revealedCount={FULL_REVEAL}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    const textarea = screen.getByDisplayValue("Bold tone.");
    fireEvent.change(textarea, { target: { value: "Confident and clear." } });
    fireEvent.blur(textarea);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ voiceSummary: "Confident and clear." })
    );
  });

  it("items are invisible before their reveal threshold", () => {
    const onUpdate = jest.fn();
    const { container } = render(
      <BrandKitReveal
        brandKit={mockBrandKit}
        revealedCount={0}
        revealVisual={3}
        revealVoice={5}
        onUpdate={onUpdate}
      />
    );
    // First RevealItem (company name) should have opacity 0
    const firstRevealItem = container.firstChild?.firstChild as HTMLElement;
    expect(firstRevealItem).toHaveStyle("opacity: 0");
  });
});
