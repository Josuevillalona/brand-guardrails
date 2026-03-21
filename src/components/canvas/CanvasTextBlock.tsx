"use client";

import { useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { TextElement } from "@/types";

interface Props {
  element: TextElement;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CanvasTextBlock({ element, selected, onMouseDown }: Props) {
  const [editing, setEditing] = useState(false);
  const { updateElement } = useStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function commitEdit(value: string) {
    updateElement(element.id, { content: value });
    setEditing(false);
  }

  return (
    <div
      onMouseDown={editing ? undefined : onMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={startEdit}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        minHeight: element.height,
        outline: selected ? "2px solid var(--canva-purple-500)" : "2px solid transparent",
        outlineOffset: 2,
        cursor: editing ? "text" : "move",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          defaultValue={element.content}
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { commitEdit((e.target as HTMLTextAreaElement).value); }
          }}
          style={{
            width: "100%",
            minHeight: element.height,
            fontSize: element.fontSize,
            color: element.color,
            fontFamily: "var(--font-sans)",
            background: "var(--color-bg-selected)",
            border: "none",
            outline: "none",
            resize: "none",
            padding: "var(--space-1)",
            lineHeight: "var(--leading-normal)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      ) : (
        <p
          style={{
            fontSize: element.fontSize,
            color: element.color,
            fontFamily: "var(--font-sans)",
            lineHeight: "var(--leading-normal)",
            padding: "var(--space-1)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            userSelect: "none",
          }}
        >
          {element.content}
        </p>
      )}
    </div>
  );
}
