import { BrandScore, ScoreDimensions } from "@/types";
import { ScoreCircle } from "./ScoreBadge";

interface Props {
  score: BrandScore;
}

type DimKey = keyof Omit<ScoreDimensions, "noProhibited">;

const DIM_LABEL: Record<DimKey, string> = {
  colorAlignment:  "Color match",
  renderStyleMatch: "Render style",
  moodLighting:    "Mood & lighting",
  compositionFit:  "Composition",
  overallCohesion: "Overall feel",
};

const DIM_KEYS: DimKey[] = [
  "colorAlignment",
  "renderStyleMatch",
  "moodLighting",
  "compositionFit",
  "overallCohesion",
];

function barColor(val: number): string {
  if (val >= 75) return "var(--color-score-on-brand)";
  if (val >= 50) return "var(--color-score-needs-review)";
  return "var(--color-score-off-brand)";
}

export function ScoreTooltipCard({ score }: Props) {
  const prohibited = !score.dimensions.noProhibited;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

      {/* 1. Top row — title left, circle right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <p className="canva-panel-label" style={{ margin: 0 }}>
          Brand Alignment Score
        </p>
        <ScoreCircle score={score} size={32} />
      </div>

      {/* 2. Explanation — full width */}
      <p style={{
        fontSize: "var(--text-sm)",
        color: "var(--color-text-secondary)",
        lineHeight: "var(--leading-normal)",
        margin: 0,
      }}>
        {score.explanation}
      </p>

      {/* 3. Divider */}
      <div className="canva-divider" style={{ margin: 0 }} />

      {/* 4. Five dimension bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {DIM_KEYS.map((key) => {
          const val = score.dimensions[key];
          const isFailing = key === score.failingDimension;
          const color = barColor(val);
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-1)" }}>
                <span style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: isFailing ? "var(--weight-bold)" : "var(--weight-medium)",
                  color: isFailing ? "var(--color-score-off-brand)" : "var(--color-text-secondary)",
                }}>
                  {DIM_LABEL[key]}
                </span>
                <span style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-bold)",
                  color,
                  minWidth: 20,
                  textAlign: "right",
                }}>
                  {val}
                </span>
              </div>
              <div className="score-dim-bar">
                <div
                  className="score-dim-bar-fill"
                  style={{ width: `${val}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Prohibited pill — only when failing */}
      {prohibited && (
        <span className="score-badge score-badge-off-brand" style={{ alignSelf: "flex-start", gap: "var(--space-1)" }}>
          ⊘ Prohibited element detected
        </span>
      )}

    </div>
  );
}
