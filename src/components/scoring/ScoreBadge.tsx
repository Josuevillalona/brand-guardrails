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
// Uses score-badge-neutral CSS class — informational, not a failure state.
export function NoBrandBadge() {
  return <span className="score-badge-neutral">No brand context</span>;
}

// White disc with colored progress arc and score number centered inside.
// Color tracks the same green/amber/red thresholds as the bar components.
export function ScoreCircle({ score, size = 56 }: { score: BrandScore; size?: number }) {
  const strokeWidth = Math.max(3, Math.round(size * 0.07));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score.score / 100);

  const color =
    score.label === "on-brand"
      ? "var(--color-score-on-brand)"
      : score.label === "needs-review"
      ? "var(--color-score-needs-review)"
      : "var(--color-score-off-brand)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* 1. White background disc */}
      <circle cx={cx} cy={cy} r={cx - 0.5} fill="white" />
      {/* 2. Gray track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--canva-gray-200)" strokeWidth={strokeWidth} />
      {/* 3. Colored progress arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* 4. Score number — centered over white background */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.round(size * 0.28)}
        fontWeight="700"
        fill={color}
        fontFamily="var(--font-sans)"
      >
        {score.score}
      </text>
    </svg>
  );
}
