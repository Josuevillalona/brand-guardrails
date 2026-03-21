"use client";

import Image from "next/image";
import { ImageElement } from "@/types";
import { ScoreBadge } from "@/components/scoring/ScoreBadge";

interface Props {
  element: ImageElement;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CanvasImageBlock({ element, selected, onMouseDown }: Props) {
  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        outline: selected ? "2px solid var(--canva-purple-500)" : "2px solid transparent",
        outlineOffset: 2,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        cursor: "move",
        userSelect: "none",
      }}
    >
      <Image
        src={element.imageUrl}
        alt={element.prompt}
        fill
        style={{ objectFit: "cover" }}
        unoptimized // DALL-E URLs are signed and expire; skip Next.js optimization
      />

      {/* Score badge overlay — bottom-left corner */}
      <div style={{ position: "absolute", bottom: 6, left: 6 }}>
        {element.scorePending ? (
          <div
            className="score-pending"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "3px var(--space-2)",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,0,0,0.5)",
              fontSize: "var(--text-xs)",
              color: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            Scoring…
          </div>
        ) : element.score ? (
          <ScoreBadge score={element.score} compact />
        ) : null}
      </div>
    </div>
  );
}
