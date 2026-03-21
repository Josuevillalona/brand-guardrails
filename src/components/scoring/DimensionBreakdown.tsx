import { BrandScore, ScoreDimensions } from "@/types";

interface Props {
  score: BrandScore;
}

type DimKey = keyof Omit<ScoreDimensions, "noProhibited">;

const DIM_LABELS: Record<DimKey, string> = {
  colorAlignment: "Color alignment",
  renderStyleMatch: "Render style",
  moodLighting: "Mood & lighting",
  compositionFit: "Composition",
  overallCohesion: "Overall cohesion",
};

const DIM_WEIGHTS: Record<DimKey, number> = {
  colorAlignment: 30,
  renderStyleMatch: 25,
  moodLighting: 20,
  compositionFit: 15,
  overallCohesion: 10,
};

function barColor(score: number): string {
  if (score >= 80) return "var(--color-score-on-brand)";
  if (score >= 50) return "var(--color-score-needs-review)";
  return "var(--color-score-off-brand)";
}

export function DimensionBreakdown({ score }: Props) {
  const dims: DimKey[] = [
    "colorAlignment",
    "renderStyleMatch",
    "moodLighting",
    "compositionFit",
    "overallCohesion",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

      {/* Prohibited hard override */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px var(--space-3)",
          borderRadius: "var(--radius-md)",
          background: score.dimensions.noProhibited
            ? "var(--color-score-on-bg)"
            : "var(--color-score-off-bg)",
          border: `1px solid ${score.dimensions.noProhibited ? "var(--color-score-on-border)" : "var(--color-score-off-border)"}`,
        }}
      >
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: "var(--color-text-secondary)" }}>
          No prohibited elements
        </span>
        <span style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-bold)",
          color: score.dimensions.noProhibited ? "var(--color-score-on-brand)" : "var(--color-score-off-brand)",
        }}>
          {score.dimensions.noProhibited ? "PASS" : "FAIL — hard override"}
        </span>
      </div>

      {/* Weighted dimensions */}
      {dims.map((key) => {
        const val = score.dimensions[key];
        const isFailing = key === score.failingDimension;
        return (
          <div key={key}>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
              <span style={{
                fontSize: "var(--text-xs)",
                fontWeight: isFailing ? "var(--weight-bold)" : "var(--weight-medium)",
                color: isFailing ? "var(--color-score-off-brand)" : "var(--color-text-secondary)",
              }}>
                {DIM_LABELS[key]}
                {isFailing && " ← lowest"}
              </span>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  {DIM_WEIGHTS[key]}%
                </span>
                <span style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-bold)",
                  color: barColor(val),
                  minWidth: 28,
                  textAlign: "right",
                }}>
                  {val}
                </span>
              </div>
            </div>
            <div className="score-dim-bar">
              <div
                className="score-dim-bar-fill"
                style={{ width: `${val}%`, background: barColor(val) }}
              />
            </div>
          </div>
        );
      })}

      {/* Issues + strengths */}
      {score.issues.length > 0 && (
        <div style={{ marginTop: "var(--space-2)" }}>
          <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Issues</p>
          {score.issues.map((issue, i) => (
            <p key={i} style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: 2 }}>
              · {issue}
            </p>
          ))}
        </div>
      )}

      {score.strengths.length > 0 && (
        <div style={{ marginTop: "var(--space-1)" }}>
          <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Strengths</p>
          {score.strengths.map((s, i) => (
            <p key={i} style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: 2 }}>
              · {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
