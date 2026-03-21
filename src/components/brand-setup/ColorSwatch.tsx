"use client";

import { useState } from "react";
import { BrandColor } from "@/types";

interface Props {
  color: BrandColor;
  onUpdateName: (name: string) => void;
}

export function ColorSwatch({ color, onUpdateName }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(color.descriptiveName);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onUpdateName(trimmed);
    setEditing(false);
  }

  return (
    <div className="flex flex-col items-center gap-1u group" style={{ minWidth: 48 }}>
      {/* Swatch circle */}
      <div
        className="canva-swatch cursor-pointer transition-all"
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-md)",
          backgroundColor: color.hex,
          outline: editing ? `2px solid var(--canva-purple-500)` : undefined,
          outlineOffset: 2,
        }}
        onClick={() => setEditing(true)}
        title={`${color.hex} · ${color.role}`}
      />

      {/* Editable descriptive name */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(color.descriptiveName); setEditing(false); }
          }}
          style={{
            width: 80,
            fontSize: "var(--text-xs)",
            textAlign: "center",
            border: "1px solid var(--canva-purple-500)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 4px",
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          title="Click to edit"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            textAlign: "center",
            maxWidth: 72,
            lineHeight: "var(--leading-tight)",
            cursor: "pointer",
          }}
        >
          {color.descriptiveName}
        </span>
      )}
    </div>
  );
}
