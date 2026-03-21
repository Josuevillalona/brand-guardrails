import { BrandScore } from "@/types";

interface Props {
  score: BrandScore;
  compact?: boolean;
}

const LABEL_TEXT: Record<string, string> = {
  "on-brand": "On brand",
  "needs-review": "Needs review",
  "off-brand": "Off brand",
};

export function ScoreBadge({ score, compact = false }: Props) {
  const cls =
    score.label === "on-brand"
      ? "score-badge score-badge-on-brand"
      : score.label === "needs-review"
      ? "score-badge score-badge-needs-review"
      : "score-badge score-badge-off-brand";

  return (
    <span className={cls}>
      {compact ? (
        <>
          {score.score}
          <span style={{ opacity: 0.7, fontWeight: 400 }}>/100</span>
        </>
      ) : (
        <>
          <strong>{score.score}</strong>
          <span style={{ opacity: 0.7, marginLeft: 2 }}>{LABEL_TEXT[score.label]}</span>
        </>
      )}
    </span>
  );
}

// Neutral badge for images generated without an active Brand Kit.
// Visually distinct from scoring badges — no number, no pass/fail signal.
export function NoBrandBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        background: "rgba(0,0,0,0.45)",
        fontSize: "var(--text-xs)",
        color: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(4px)",
        fontWeight: "var(--weight-medium)",
        letterSpacing: "0.01em",
      }}
    >
      No brand context
    </span>
  );
}
