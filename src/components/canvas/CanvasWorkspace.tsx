"use client";

import { useRef, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { TextElement, ImageElement } from "@/types";
import { CanvasTextBlock } from "./CanvasTextBlock";
import { CanvasImageBlock } from "./CanvasImageBlock";
import { ImageGeneratorPanel } from "@/components/generation/ImageGeneratorPanel";

const CANVAS_W = 900;
const CANVAS_H = 600;

export function CanvasWorkspace() {
  const {
    canvasElements,
    selectedElementId,
    selectElement,
    updateElement,
    removeElement,
    addTextElement,
    brandKit,
  } = useStore();

  const [showGenerator, setShowGenerator] = useState(false);

  // Drag tracking
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      selectElement(id);
      const el = canvasElements.find((c) => c.id === id);
      if (!el) return;
      drag.current = { id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y };
    },
    [canvasElements, selectElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      updateElement(drag.current.id, {
        x: Math.max(0, drag.current.elX + dx),
        y: Math.max(0, drag.current.elY + dy),
      });
    },
    [updateElement]
  );

  const stopDrag = useCallback(() => { drag.current = null; }, []);

  function addText() {
    addTextElement({
      type: "text",
      x: 60,
      y: 60,
      width: 240,
      height: 44,
      content: "Double-click to edit",
      fontSize: 18,
      color: "#1a1a1a",
    });
  }

  const isEmpty = canvasElements.length === 0;
  const selected = canvasElements.find((el) => el.id === selectedElementId);

  return (
    <div className="canva-editor" style={{ flex: 1, overflow: "hidden" }}>

      {/* ── Left icon strip ── */}
      <div className="canva-icon-strip">
        <IconItem label="Text" active={false} onClick={addText}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-icon)" }}>T</span>
        </IconItem>
        <IconItem
          label="Generate"
          active={showGenerator}
          onClick={() => brandKit && setShowGenerator(true)}
          disabled={!brandKit}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L10 13l-4.2 3 1.7-5.3L3 7.4h5.2L10 2z" fill="currentColor" />
          </svg>
        </IconItem>
      </div>

      {/* ── Left panel — element list or brand summary ── */}
      <div className="canva-panel" style={{ width: 200 }}>
        <div className="canva-panel-header">
          <p className="canva-panel-label">Layers</p>
        </div>
        <div className="canva-panel-body" style={{ padding: "var(--space-2)" }}>
          {canvasElements.length === 0 ? (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", padding: "var(--space-2)" }}>
              No elements yet
            </p>
          ) : (
            [...canvasElements].reverse().map((el) => (
              <div
                key={el.id}
                onClick={() => selectElement(el.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "6px var(--space-2)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  background: selectedElementId === el.id ? "var(--color-bg-selected)" : "transparent",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>{el.type === "text" ? "T" : "▣"}</span>
                <span className="truncate" style={{ flex: 1 }}>
                  {el.type === "text" ? el.content.slice(0, 18) : "Image"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                  className="btn-icon"
                  style={{ width: 20, height: 20, fontSize: 12, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Brand Kit mini-summary */}
        {brandKit && (
          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-subtle)" }}>
            <p className="canva-panel-label">Brand Kit</p>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
              {brandKit.companyName}
            </p>
            <div className="flex gap-1u flex-wrap">
              {brandKit.colors.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="canva-swatch"
                  style={{ width: 14, height: 14, backgroundColor: c.hex, borderRadius: "var(--radius-sm)" }}
                  title={c.descriptiveName}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div className="canva-canvas-area canva-canvas-area-dots">
        <div
          className="canva-canvas-surface"
          style={{ width: CANVAS_W, height: CANVAS_H, position: "relative", userSelect: "none" }}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onClick={() => selectElement(null)}
        >
          {/* Empty state */}
          {isEmpty && (
            <div
              className="flex flex-col items-center justify-center"
              style={{
                position: "absolute",
                inset: 0,
                gap: "var(--space-3)",
                pointerEvents: "none",
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius-pill)",
                background: "var(--canva-gray-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "var(--color-text-muted)",
              }}>
                +
              </div>
              <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-muted)" }}>
                Add text or generate an image to get started
              </p>
            </div>
          )}

          {/* Elements — rendered in z-order */}
          {[...canvasElements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) =>
              el.type === "text" ? (
                <CanvasTextBlock
                  key={el.id}
                  element={el as TextElement}
                  selected={selectedElementId === el.id}
                  onMouseDown={(e) => handleMouseDown(el.id, e)}
                />
              ) : (
                <CanvasImageBlock
                  key={el.id}
                  element={el as ImageElement}
                  selected={selectedElementId === el.id}
                  onMouseDown={(e) => handleMouseDown(el.id, e)}
                />
              )
            )}
        </div>
      </div>

      {/* ── Right properties panel — shown when element is selected ── */}
      {selected && (
        <div className="canva-panel" style={{ borderLeft: "1px solid var(--color-border-default)", borderRight: "none" }}>
          <div className="canva-panel-header">
            <p className="canva-panel-label">Properties</p>
          </div>
          <div className="canva-panel-body">
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
              {selected.type === "text" ? "Text block" : "Image block"}
            </p>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <p className="canva-panel-label">Position</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                x: {Math.round(selected.x)} · y: {Math.round(selected.y)}
              </p>
            </div>
            <button
              onClick={() => removeElement(selected.id)}
              className="btn-ghost"
              style={{ width: "100%", justifyContent: "center", color: "var(--color-score-off-brand)" }}
            >
              Delete element
            </button>
          </div>
        </div>
      )}

      {/* ── Image generator slide-in panel ── */}
      {showGenerator && brandKit && (
        <ImageGeneratorPanel onClose={() => setShowGenerator(false)} />
      )}
    </div>
  );
}

function IconItem({
  label,
  active,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`canva-icon-item${active ? " active" : ""}`}
      onClick={disabled ? undefined : onClick}
      style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span className="canva-icon-glyph">{children}</span>
      <span className="canva-icon-label">{label}</span>
    </div>
  );
}
