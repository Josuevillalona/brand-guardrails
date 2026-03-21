"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageElement } from "@/types";

interface Props {
  element: ImageElement;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CanvasImageBlock({ element, selected, onMouseDown }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        outline: selected
          ? "2px solid var(--canva-purple-500)"
          : hovered
          ? "2px solid rgba(125, 42, 231, 0.35)"
          : "2px solid transparent",
        outlineOffset: 2,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <Image
        src={element.imageUrl}
        alt={element.prompt}
        fill
        draggable={false}
        style={{ objectFit: "cover", pointerEvents: "none" }}
        unoptimized
      />

    </div>
  );
}
