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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* 1. Score circle */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ScoreCircle score={score} size={44} />
      </div>

      {/* 2. Explanation sentence */}
      <p style={{
        fontSize: "var(--text-xs)",
        color: "var(--color-text-secondary)",
        lineHeight: 1.5,
        margin: 0,
      }}>
        {score.explanation}
      </p>

      {/* 3. All five dimension bars — label, bar, score. No weight percentages. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {DIM_KEYS.map((key) => {
          const val = score.dimensions[key];
          const isFailing = key === score.failingDimension;
          const color = barColor(val);
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
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
                  minWidth: 24,
                  textAlign: "right",
                }}>
                  {val}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "#f0f0f0" }}>
                <div style={{
                  height: "100%",
                  width: `${val}%`,
                  borderRadius: 2,
                  background: color,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Prohibited pill — only when failing */}
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

    </div>
  );
}
