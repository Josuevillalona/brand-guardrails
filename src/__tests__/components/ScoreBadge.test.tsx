import React from "react";
import { render, screen } from "@testing-library/react";
import { ScoreBadge, NoBrandBadge, ScoreCircle } from "@/components/scoring/ScoreBadge";
import { BrandScore } from "@/types";

const makeScore = (overrides: Partial<BrandScore> = {}): BrandScore => ({
  score: 85,
  label: "on-brand",
  explanation: "Great match",
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
  strengths: ["Good lighting"],
  ...overrides,
});

describe("ScoreBadge", () => {
  it("renders score number", () => {
    render(<ScoreBadge score={makeScore({ score: 85 })} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders label text in full mode", () => {
    render(<ScoreBadge score={makeScore({ label: "on-brand" })} />);
    expect(screen.getByText("On brand")).toBeInTheDocument();
  });

  it("renders needs-review label", () => {
    render(<ScoreBadge score={makeScore({ score: 65, label: "needs-review" })} />);
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("renders off-brand label", () => {
    render(<ScoreBadge score={makeScore({ score: 30, label: "off-brand" })} />);
    expect(screen.getByText("Off brand")).toBeInTheDocument();
  });

  it("compact mode renders score with /100", () => {
    render(<ScoreBadge score={makeScore({ score: 72 })} compact />);
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("compact mode does not render label text", () => {
    render(<ScoreBadge score={makeScore({ label: "on-brand" })} compact />);
    expect(screen.queryByText("On brand")).not.toBeInTheDocument();
  });

  it("applies on-brand CSS class", () => {
    const { container } = render(<ScoreBadge score={makeScore({ label: "on-brand" })} />);
    expect(container.firstChild).toHaveClass("score-badge-on-brand");
  });

  it("applies needs-review CSS class", () => {
    const { container } = render(<ScoreBadge score={makeScore({ label: "needs-review" })} />);
    expect(container.firstChild).toHaveClass("score-badge-needs-review");
  });

  it("applies off-brand CSS class", () => {
    const { container } = render(<ScoreBadge score={makeScore({ label: "off-brand" })} />);
    expect(container.firstChild).toHaveClass("score-badge-off-brand");
  });
});

describe("NoBrandBadge", () => {
  it("renders no brand context text", () => {
    render(<NoBrandBadge />);
    expect(screen.getByText("No brand context")).toBeInTheDocument();
  });

  it("applies neutral CSS class", () => {
    const { container } = render(<NoBrandBadge />);
    expect(container.firstChild).toHaveClass("score-badge-neutral");
  });
});

describe("ScoreCircle", () => {
  it("renders an SVG", () => {
    const { container } = render(<ScoreCircle score={makeScore({ score: 80 })} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the score number inside the SVG", () => {
    render(<ScoreCircle score={makeScore({ score: 78 })} />);
    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("uses custom size prop", () => {
    const { container } = render(<ScoreCircle score={makeScore()} size={40} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });
});
