import React from "react";
import { render, screen } from "@testing-library/react";
import { DimensionBreakdown } from "@/components/scoring/DimensionBreakdown";
import { BrandScore } from "@/types";

const makeScore = (overrides: Partial<BrandScore> = {}): BrandScore => ({
  score: 82,
  label: "on-brand",
  explanation: "Solid brand match",
  dimensions: {
    colorAlignment: 85,
    renderStyleMatch: 80,
    moodLighting: 90,
    compositionFit: 75,
    overallCohesion: 80,
    noProhibited: true,
  },
  failingDimension: null,
  issues: [],
  strengths: ["Strong lighting"],
  ...overrides,
});

describe("DimensionBreakdown", () => {
  it("renders all 5 dimension labels", () => {
    render(<DimensionBreakdown score={makeScore()} />);
    expect(screen.getByText("Color alignment")).toBeInTheDocument();
    expect(screen.getByText("Render style")).toBeInTheDocument();
    expect(screen.getByText("Mood & lighting")).toBeInTheDocument();
    expect(screen.getByText("Composition")).toBeInTheDocument();
    expect(screen.getByText("Overall cohesion")).toBeInTheDocument();
  });

  it("renders PASS when noProhibited is true", () => {
    render(<DimensionBreakdown score={makeScore()} />);
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("renders FAIL hard override when noProhibited is false", () => {
    render(<DimensionBreakdown score={makeScore({ dimensions: { ...makeScore().dimensions, noProhibited: false } })} />);
    expect(screen.getByText("FAIL — hard override")).toBeInTheDocument();
  });

  it("marks the failing dimension with ← lowest", () => {
    render(<DimensionBreakdown score={makeScore({ failingDimension: "colorAlignment" })} />);
    expect(screen.getByText(/Color alignment.*← lowest/)).toBeInTheDocument();
  });

  it("does not show ← lowest when no failing dimension", () => {
    render(<DimensionBreakdown score={makeScore({ failingDimension: null })} />);
    expect(screen.queryByText(/← lowest/)).not.toBeInTheDocument();
  });

  it("renders issues when present", () => {
    render(<DimensionBreakdown score={makeScore({ issues: ["Color palette drift"] })} />);
    expect(screen.getByText(/Color palette drift/)).toBeInTheDocument();
  });

  it("does not render issues section when empty", () => {
    render(<DimensionBreakdown score={makeScore({ issues: [] })} />);
    expect(screen.queryByText("Issues")).not.toBeInTheDocument();
  });

  it("renders strengths when present", () => {
    render(<DimensionBreakdown score={makeScore({ strengths: ["Excellent lighting"] })} />);
    expect(screen.getByText(/Excellent lighting/)).toBeInTheDocument();
  });

  it("does not render strengths section when empty", () => {
    render(<DimensionBreakdown score={makeScore({ strengths: [] })} />);
    expect(screen.queryByText("Strengths")).not.toBeInTheDocument();
  });

  it("renders dimension weight percentages", () => {
    render(<DimensionBreakdown score={makeScore()} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders dimension score values", () => {
    render(<DimensionBreakdown score={makeScore()} />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getAllByText("80").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("90")).toBeInTheDocument();
  });
});
