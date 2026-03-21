import { BrandScore, ScoreDimensions } from "@/types";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  score: BrandScore;
}

const DIM_LABEL: Record<keyof Omit<ScoreDimensions, "noProhibited">, string> = {
  colorAlignment:  "Color match",
  renderStyleMatch: "Render style",
  moodLighting:    "Mood & lighting",
  compositionFit:  "Composition",
  overallCohesion: "Overall feel",
};

function barColor(val: number): string {
  if (val >= 75) return "var(--color-score-on-brand)";
  if (val >= 50) return "var(--color-score-needs-review)";
  return "var(--color-score-off-brand)";
}

export function ScoreTooltipCard({ score }: Props) {
  const prohibited = !score.dimensions.noProhibited;
  const failKey = score.failingDimension;
  const failVal = failKey ? score.dimensions[failKey] : null;
  const isOnBrand = score.label === "on-brand";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* 1. Prohibited pill — always first when present, highest priority signal */}
      {prohibited && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 4,
          background: "var(--color-score-off-bg)",
          border: "1px solid var(--color-score-off-border)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-bold)",
          color: "var(--color-score-off-brand)",
        }}>
          <span style={{ fontSize: 11 }}>⊘</span>
          Prohibited element detected
        </div>
      )}

      {/* 2. Score badge */}
      <ScoreBadge score={score} />

      {/* 3. Explanation sentence */}
      <p style={{
        fontSize: "var(--text-xs)",
        color: "var(--color-text-secondary)",
        lineHeight: 1.5,
        margin: 0,
      }}>
        {score.explanation}
      </p>

      {/* 4. Single failing dimension — only when not on-brand */}
      {!isOnBrand && failKey && failVal !== null && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              color: "var(--color-text-secondary)",
            }}>
              {DIM_LABEL[failKey]}
            </span>
            <span style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-bold)",
              color: barColor(failVal),
            }}>
              {failVal}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "#f0f0f0" }}>
            <div style={{
              height: "100%",
              width: `${failVal}%`,
              borderRadius: 2,
              background: barColor(failVal),
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

    </div>
  );
}
