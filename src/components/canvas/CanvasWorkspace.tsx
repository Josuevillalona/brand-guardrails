"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { TextElement, ImageElement } from "@/types";
import { CanvasTextBlock } from "./CanvasTextBlock";
import { CanvasImageBlock } from "./CanvasImageBlock";
import { ImageGeneratorPanel } from "@/components/generation/ImageGeneratorPanel";
import { ScoreBadge } from "@/components/scoring/ScoreBadge";
import { DimensionBreakdown } from "@/components/scoring/DimensionBreakdown";

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
    setShowBrandSetup,
  } = useStore();

  const [showGenerator, setShowGenerator] = useState(false);
  const [panelWidth, setPanelWidth] = useState(260);
  const panelResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset tooltip when selection changes or generator opens
  useEffect(() => {
    setShowScoreTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, [selectedElementId, showGenerator]);

  function showTooltipDelayed() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowScoreTooltip(true), 300);
  }

  function hideTooltip() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowScoreTooltip(false);
  }

  const DRAG_THRESHOLD = 4; // px before a mousedown becomes a drag

  // Drag tracking
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
    elW: number;
    elH: number;
    active: boolean; // true once threshold exceeded
  } | null>(null);

  // Resize tracking
  const resize = useRef<{
    id: string;
    handle: "nw" | "ne" | "se" | "sw";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startElX: number;
    startElY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      selectElement(id);
      const el = canvasElements.find((c) => c.id === id);
      if (!el) return;
      drag.current = { id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y, elW: el.width, elH: el.height, active: false };
    },
    [canvasElements, selectElement]
  );

  const startResize = useCallback(
    (handle: "nw" | "ne" | "se" | "sw", e: React.MouseEvent) => {
      e.stopPropagation();
      const el = canvasElements.find((c) => c.id === selectedElementId);
      if (!el) return;
      resize.current = {
        id: el.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: el.width,
        startH: el.height,
        startElX: el.x,
        startElY: el.y,
      };
    },
    [canvasElements, selectedElementId]
  );

  // Window-level move/up listeners — fire regardless of where the mouse is,
  // so fast moves outside the canvas or releasing outside never get stuck.
  useEffect(() => {
    const MIN_RESIZE = 40;

    function onMove(e: MouseEvent) {
      if (panelResizeRef.current) {
        const dx = e.clientX - panelResizeRef.current.startX;
        const newW = Math.max(220, Math.min(540, panelResizeRef.current.startWidth + dx));
        setPanelWidth(newW);
        return;
      }
      if (resize.current) {
        const { id, handle, startX, startY, startW, startH, startElX, startElY } = resize.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (handle === "se") {
          updateElement(id, { width: Math.max(MIN_RESIZE, startW + dx), height: Math.max(MIN_RESIZE, startH + dy) });
        } else if (handle === "sw") {
          const newW = Math.max(MIN_RESIZE, startW - dx);
          updateElement(id, { x: startElX + startW - newW, width: newW, height: Math.max(MIN_RESIZE, startH + dy) });
        } else if (handle === "ne") {
          const newH = Math.max(MIN_RESIZE, startH - dy);
          updateElement(id, { y: startElY + startH - newH, width: Math.max(MIN_RESIZE, startW + dx), height: newH });
        } else if (handle === "nw") {
          const newW = Math.max(MIN_RESIZE, startW - dx);
          const newH = Math.max(MIN_RESIZE, startH - dy);
          updateElement(id, { x: startElX + startW - newW, y: startElY + startH - newH, width: newW, height: newH });
        }
        return;
      }
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (!drag.current.active) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.current.active = true;
        document.body.style.cursor = "grabbing";
      }
      updateElement(drag.current.id, {
        x: Math.min(CANVAS_W - drag.current.elW, Math.max(0, drag.current.elX + dx)),
        y: Math.min(CANVAS_H - drag.current.elH, Math.max(0, drag.current.elY + dy)),
      });
    }

    function onUp() {
      drag.current = null;
      resize.current = null;
      panelResizeRef.current = null;
      document.body.style.cursor = "";
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateElement]);

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
          onClick={() => setShowGenerator((v) => !v)}
          disabled={false}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L10 13l-4.2 3 1.7-5.3L3 7.4h5.2L10 2z" fill="currentColor" />
          </svg>
        </IconItem>
      </div>

      {/* ── Left panel — layers/brand OR generator (Magic Media style) ── */}
      {showGenerator && (
        <>
          <ImageGeneratorPanel onClose={() => setShowGenerator(false)} width={panelWidth} />
          {/* Resize handle — drag right edge to widen/narrow the panel */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              panelResizeRef.current = { startX: e.clientX, startWidth: panelWidth };
              document.body.style.cursor = "col-resize";
            }}
            title="Drag to resize panel"
            style={{
              width: 6,
              flexShrink: 0,
              cursor: "col-resize",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
              zIndex: 5,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(125,42,231,0.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "#c8c8c8" }} />
              ))}
            </div>
          </div>
        </>
      )}
      <div className="canva-panel" style={{ width: 200, display: showGenerator ? "none" : undefined }}>
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

        {/* Brand Kit panel — always rendered */}
        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="canva-panel-label">Brand Kit</p>
          {brandKit ? (
            <>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                {brandKit.companyName}
              </p>
              <div className="flex gap-1u flex-wrap" style={{ marginBottom: "var(--space-2)" }}>
                {brandKit.colors.slice(0, 5).map((c, i) => (
                  <div
                    key={i}
                    className="canva-swatch"
                    style={{ width: 14, height: 14, backgroundColor: c.hex, borderRadius: "var(--radius-sm)" }}
                    title={c.descriptiveName}
                  />
                ))}
              </div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                {brandKit.renderStyle}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                No brand kit active
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: 1.4 }}>
                Images generate without brand context
              </p>
              <button
                onClick={() => setShowBrandSetup(true)}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}
              >
                Add brand kit
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="canva-canvas-area canva-canvas-area-dots">
        <div
          className="canva-canvas-surface"
          style={{ width: CANVAS_W, height: CANVAS_H, position: "relative", userSelect: "none" }}
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

          {/* Resize handles — rendered over the selected element */}
          {selected && ([
            { handle: "nw" as const, cursor: "nw-resize", left: selected.x - 5,               top: selected.y - 5 },
            { handle: "ne" as const, cursor: "ne-resize", left: selected.x + selected.width - 5, top: selected.y - 5 },
            { handle: "se" as const, cursor: "se-resize", left: selected.x + selected.width - 5, top: selected.y + selected.height - 5 },
            { handle: "sw" as const, cursor: "sw-resize", left: selected.x - 5,               top: selected.y + selected.height - 5 },
          ].map(({ handle, cursor, left, top }) => (
            <div
              key={handle}
              onMouseDown={(e) => startResize(handle, e)}
              style={{
                position: "absolute",
                left,
                top,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--canva-purple-500)",
                border: "2px solid white",
                cursor,
                zIndex: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            />
          )))}

          {/* Floating contextual toolbar — appears above (or below) selected element */}
          {selected && (() => {
            const TOOLBAR_H = 36;
            const GAP = 8;
            const aboveY = selected.y - TOOLBAR_H - GAP;
            const toolbarAbove = aboveY >= 4;
            const toolbarTop = toolbarAbove ? aboveY : selected.y + selected.height + GAP;
            const toolbarLeft = Math.min(CANVAS_W - 300, Math.max(0, selected.x));

            const imageEl = selected.type === "image" ? (selected as ImageElement) : null;
            const imageScore = imageEl?.score && !imageEl.scorePending ? imageEl.score : null;

            return (
              <>
                {/* Toolbar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: toolbarLeft,
                    top: toolbarTop,
                    zIndex: 30,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    background: "white",
                    borderRadius: "var(--radius-lg)",
                    padding: "0 6px",
                    height: TOOLBAR_H,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(0,0,0,0.07)",
                    userSelect: "none",
                  }}
                >
                  {/* Text-specific controls */}
                  {selected.type === "text" && (
                    <>
                      {/* Font size */}
                      <input
                        type="number"
                        value={(selected as TextElement).fontSize}
                        min={8}
                        max={96}
                        onChange={(e) => updateElement(selected.id, { fontSize: Math.min(96, Math.max(8, Number(e.target.value))) })}
                        style={{
                          width: 48,
                          height: 24,
                          border: "1px solid var(--color-border-default)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "var(--text-xs)",
                          fontFamily: "var(--font-sans)",
                          textAlign: "center",
                          color: "var(--color-text-primary)",
                          padding: "0 4px",
                        }}
                      />
                      {/* Color picker */}
                      <div style={{ position: "relative", width: 24, height: 24, marginLeft: 2 }}>
                        <input
                          type="color"
                          value={(selected as TextElement).color}
                          onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                          style={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0,
                            cursor: "pointer",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: (selected as TextElement).color,
                          border: "2px solid rgba(0,0,0,0.15)",
                          pointerEvents: "none",
                        }} />
                      </div>
                      <ToolbarDivider />
                    </>
                  )}

                  {/* Image brand score — hover to reveal full breakdown */}
                  {imageScore && (
                    <>
                      <div
                        onMouseEnter={showTooltipDelayed}
                        onMouseLeave={hideTooltip}
                        style={{ display: "flex", alignItems: "center", padding: "0 4px", cursor: "default" }}
                      >
                        <ScoreBadge score={imageScore} compact />
                      </div>
                      <ToolbarDivider />
                    </>
                  )}

                  {/* Size readout */}
                  <span style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    padding: "0 6px",
                    whiteSpace: "nowrap",
                  }}>
                    {Math.round(selected.width)}×{Math.round(selected.height)}
                  </span>

                  <ToolbarDivider />

                  {/* Delete */}
                  <button
                    onClick={() => removeElement(selected.id)}
                    title="Delete"
                    style={{
                      width: 28,
                      height: 28,
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      background: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-muted)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-score-off-brand)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "none";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 0 1 .583-.583h2.334a.583.583 0 0 1 .583.583V3.5m1.75 0-.583 7.583a.583.583 0 0 1-.583.584H4.667a.583.583 0 0 1-.584-.584L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Score breakdown tooltip — opacity transition, 300ms appear delay */}
                {imageScore && (() => {
                  const TOOLTIP_W = 280;
                  const TOOLTIP_H = 280; // estimated for flip detection
                  const ttLeft = Math.min(CANVAS_W - TOOLTIP_W - 4, Math.max(0, toolbarLeft));
                  const ttTop = toolbarTop - TOOLTIP_H - 8 >= 0
                    ? toolbarTop - TOOLTIP_H - 8
                    : toolbarTop + TOOLBAR_H + 8;
                  return (
                    <div
                      onMouseEnter={() => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }}
                      onMouseLeave={hideTooltip}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        left: ttLeft,
                        top: ttTop,
                        width: TOOLTIP_W,
                        zIndex: 31,
                        background: "white",
                        borderRadius: "var(--radius-lg)",
                        padding: 14,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08)",
                        border: "1px solid rgba(0,0,0,0.07)",
                        opacity: showScoreTooltip ? 1 : 0,
                        pointerEvents: showScoreTooltip ? "auto" : "none",
                        transition: "opacity 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)", margin: 0 }}>
                          Brand score
                        </p>
                        <ScoreBadge score={imageScore} />
                      </div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.45 }}>
                        {imageScore.explanation}
                      </p>
                      <DimensionBreakdown score={imageScore} />
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      </div>


    </div>
  );
}

function ToolbarDivider() {
  return (
    <div style={{ width: 1, height: 18, background: "var(--color-border-default)", margin: "0 4px", flexShrink: 0 }} />
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
