import React from "react";
import { render, screen } from "@testing-library/react";
import { ScoreTooltipCard } from "@/components/scoring/ScoreTooltipCard";
import { BrandScore } from "@/types";

const makeScore = (overrides: Partial<BrandScore> = {}): BrandScore => ({
  score: 82,
  label: "on-brand",
  explanation: "Image aligns well with brand aesthetics.",
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

describe("ScoreTooltipCard", () => {
  it("renders Brand Alignment Score header", () => {
    render(<ScoreTooltipCard score={makeScore()} />);
    expect(screen.getByText("Brand Alignment Score")).toBeInTheDocument();
  });

  it("renders the explanation text", () => {
    render(<ScoreTooltipCard score={makeScore()} />);
    expect(screen.getByText("Image aligns well with brand aesthetics.")).toBeInTheDocument();
  });

  it("renders all 5 dimension labels", () => {
    render(<ScoreTooltipCard score={makeScore()} />);
    expect(screen.getByText("Color match")).toBeInTheDocument();
    expect(screen.getByText("Render style")).toBeInTheDocument();
    expect(screen.getByText("Mood & lighting")).toBeInTheDocument();
    expect(screen.getByText("Composition")).toBeInTheDocument();
    expect(screen.getByText("Overall feel")).toBeInTheDocument();
  });

  it("does not show prohibited pill when noProhibited is true", () => {
    render(<ScoreTooltipCard score={makeScore()} />);
    expect(screen.queryByText(/Prohibited element detected/)).not.toBeInTheDocument();
  });

  it("shows prohibited pill when noProhibited is false", () => {
    render(<ScoreTooltipCard score={makeScore({ dimensions: { ...makeScore().dimensions, noProhibited: false } })} />);
    expect(screen.getByText(/Prohibited element detected/)).toBeInTheDocument();
  });

  it("highlights the failing dimension label", () => {
    render(<ScoreTooltipCard score={makeScore({ failingDimension: "moodLighting" })} />);
    const el = screen.getByText("Mood & lighting");
    expect(el).toHaveStyle("font-weight: var(--weight-bold)");
  });

  it("renders the score number via ScoreCircle", () => {
    render(<ScoreTooltipCard score={makeScore({ score: 77 })} />);
    expect(screen.getByText("77")).toBeInTheDocument();
  });
});
