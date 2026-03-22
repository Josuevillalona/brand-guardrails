"use client";

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import html2canvas from "html2canvas";
import { createPortal } from "react-dom";
import { useStore } from "@/store/useStore";
import { TextElement, ImageElement } from "@/types";
import { CanvasTextBlock } from "./CanvasTextBlock";
import { CanvasImageBlock } from "./CanvasImageBlock";
import { ImageGeneratorPanel } from "@/components/generation/ImageGeneratorPanel";
import { ScoreCircle } from "@/components/scoring/ScoreBadge";
import { ScoreTooltipCard } from "@/components/scoring/ScoreTooltipCard";

const CANVAS_W = 900;
const CANVAS_H = 600;

export interface CanvasWorkspaceHandle {
  exportCanvas: () => void;
}

export const CanvasWorkspace = forwardRef<CanvasWorkspaceHandle>(function CanvasWorkspace(_, ref) {
  const {
    canvasElements,
    selectedElementId,
    selectElement,
    updateElement,
    removeElement,
    addTextElement,
    brandKit,
    brandExtracting,
    updateBrandKit,
    setShowBrandSetup,
  } = useStore();

  type PanelType = "generator" | "brand" | "layers" | null;
  const PANEL_MS = 180;
  const [activePanel, setActivePanel]       = useState<PanelType>("layers");
  const [displayedPanel, setDisplayedPanel] = useState<PanelType>("layers");
  const [panelVisible, setPanelVisible]     = useState(true);

  function switchPanel(next: PanelType) {
    const target = next === activePanel ? null : next;
    if (target === activePanel) return;
    setPanelVisible(false);
    setTimeout(() => { setActivePanel(target); setDisplayedPanel(target); setPanelVisible(true); }, PANEL_MS);
  }

  const showGenerator = activePanel === "generator";
  const showBrand     = activePanel === "brand";
  const showLayers    = activePanel === "layers";

  function openGenerator() { switchPanel("generator"); }
  function openBrand()     { switchPanel("brand"); }
  function openLayers()    { switchPanel("layers"); }
  function closeAll()      { switchPanel(activePanel); } // toggles current off

  const [panelWidth, setPanelWidth] = useState(340);
  const [editingBrand, setEditingBrand] = useState(false);
  const [newProhibited, setNewProhibited] = useState("");
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [draftHex, setDraftHex] = useState("");
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerIdx === null) return;
    function onDown(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerIdx(null);
        setColorPickerPos(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorPickerIdx]);

  const panelResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset tooltip when selection changes or a panel opens
  useEffect(() => {
    setShowScoreTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, [selectedElementId, showGenerator, showBrand, showLayers]);

  function showTooltipDelayed() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowScoreTooltip(true), 300);
  }

  function hideTooltip() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowScoreTooltip(false);
  }

  const DRAG_THRESHOLD = 4; // px before a mousedown becomes a drag

  const canvasSurfaceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportCanvas() {
    if (!canvasSurfaceRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(canvasSurfaceRef.current, {
        useCORS: true,
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = "brand-guardrails-canvas.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  useImperativeHandle(ref, () => ({ exportCanvas }));

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
        <IconItem
          label="Layers"
          active={showLayers}
          onClick={() => showLayers ? closeAll() : openLayers()}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5L17 6.5L10 10.5L3 6.5L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
            <path d="M3 10.5L10 14.5L17 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 13.5L10 17.5L17 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconItem>
        <IconItem
          label="Generate"
          active={showGenerator}
          onClick={() => showGenerator ? closeAll() : openGenerator()}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L10 13l-4.2 3 1.7-5.3L3 7.4h5.2L10 2z" fill="currentColor" />
          </svg>
        </IconItem>
        <IconItem label="Add text" active={false} onClick={addText}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-icon)" }}>T</span>
        </IconItem>
        <IconItem
          label="Brand"
          active={showBrand}
          onClick={() => showBrand ? closeAll() : openBrand()}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L13.5 7H18L14 11.5L15.5 17L10 14L4.5 17L6 11.5L2 7H6.5L10 2Z" fill="currentColor" opacity="0.85" />
          </svg>
        </IconItem>
      </div>

      {/* ── Left panel — animated container ── */}
      {/* Generator always mounted (display:none) to preserve generation state */}
      <div style={{
        display: displayedPanel ? "flex" : "none",
        opacity: panelVisible ? 1 : 0,
        transform: panelVisible ? "translateX(0)" : "translateX(-8px)",
        transition: `opacity ${PANEL_MS}ms ease, transform ${PANEL_MS}ms ease`,
        flexShrink: 0,
        height: "100%",
      }}>
        {/* Generator panel — always mounted, hidden when inactive */}
        <div style={{ display: displayedPanel === "generator" ? "flex" : "none", height: "100%" }}>
          <ImageGeneratorPanel onClose={closeAll} width={panelWidth} />
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
        </div>{/* end generator inner */}

        {/* ── Brand Kit panel ── */}
        {displayedPanel === "brand" && (
          <>
        <div style={{
          width: panelWidth,
          flexShrink: 0,
          background: "var(--color-bg-surface)",
          borderRight: "1px solid var(--color-border-default)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
              Brand Kit
            </p>
            {brandKit && (
              <button
                onClick={() => setEditingBrand(e => !e)}
                style={{
                  background: editingBrand ? "var(--canva-purple-500)" : "none",
                  border: editingBrand ? "none" : "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "var(--text-xs)",
                  color: editingBrand ? "#fff" : "var(--canva-purple-500)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: "var(--weight-medium)",
                  padding: editingBrand ? "2px 8px" : 0,
                  transition: "all var(--transition-fast)",
                }}
              >
                {editingBrand ? "Done" : "Edit"}
              </button>
            )}
          </div>

          {brandKit ? (
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Company name — subtle header strip */}
              <div style={{
                padding: "var(--space-3) var(--space-4)",
                background: "var(--canva-gray-50)",
                borderBottom: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}>
                {/* Colour dot cluster */}
                <div style={{ display: "flex" }}>
                  {brandKit.colors.slice(0, 3).map((c, i) => (
                    <div key={i} style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: c.hex,
                      border: "1.5px solid white",
                      marginLeft: i > 0 ? -4 : 0,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {brandKit.companyName}
                </span>
              </div>

              {/* ── Colours ── */}
              <BrandSection label="Colours">
                <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Colour palette</p>
                {/* Canva-style: large tall rectangular blocks side by side, rounded container */}
                <div style={{ display: "flex", gap: 3, marginBottom: "var(--space-3)" }}>
                  {brandKit.colors.map((c, i) => (
                    <div
                      key={i}
                      title={c.hex}
                      onClick={(e) => {
                        if (!editingBrand) return;
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setColorPickerIdx(i);
                        setDraftHex(c.hex);
                        setColorPickerPos({ x: r.left, y: r.bottom + 6 });
                      }}
                      style={{
                        flex: 1, height: 56,
                        background: c.hex,
                        borderRadius: i === 0 ? "6px 0 0 6px" : i === brandKit.colors.length - 1 ? "0 6px 6px 0" : 0,
                        position: "relative",
                        cursor: editingBrand ? "pointer" : "default",
                        transition: "filter 0.15s",
                      }}
                      onMouseEnter={e => editingBrand && ((e.currentTarget as HTMLDivElement).style.filter = "brightness(0.88)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.filter = "none")}
                    >
                      {editingBrand && brandKit.colors.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateBrandKit({ colors: brandKit.colors.filter((_, ci) => ci !== i) }); }}
                          style={{ position: "absolute", top: -5, right: -5, width: 15, height: 15, borderRadius: "50%", background: "#1a1a1a", border: "1.5px solid white", color: "#fff", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1, zIndex: 1 }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Hex labels below each block */}
                <div style={{ display: "flex", gap: 3 }}>
                  {brandKit.colors.map((c, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 9, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
                        {c.hex.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </BrandSection>

              {/* ── Visual Style ── */}
              <BrandSection label="Visual Style">
                {([
                  ["Render style", fmtStr(brandKit.renderStyle),    "renderStyle"],
                  ["Mood",         fmtArr(brandKit.moodAdjectives), "moodAdjectives"],
                  ["Lighting",     fmtStr(brandKit.lightingStyle),  "lightingStyle"],
                  ["Shot type",    fmtStr(brandKit.shotType),       "shotType"],
                ] as [string, string, keyof typeof brandKit][]).filter(([, v]) => v).map(([label, value, field], idx, arr) => (
                  <div key={label} style={{
                    display: "flex", alignItems: "baseline", gap: "var(--space-3)",
                    padding: "var(--space-2) 0",
                    borderBottom: idx < arr.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0, width: 72 }}>
                      {label}
                    </span>
                    {editingBrand ? (
                      <input
                        defaultValue={value}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          if (field === "moodAdjectives") {
                            updateBrandKit({ moodAdjectives: raw.split(",").map(s => s.trim()).filter(Boolean) });
                          } else {
                            updateBrandKit({ [field]: raw } as Partial<typeof brandKit>);
                          }
                        }}
                        style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: "var(--color-text-primary)", border: "none", borderBottom: "1px solid var(--canva-purple-300)", background: "transparent", outline: "none", fontFamily: "var(--font-sans)", padding: "1px 0" }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: "var(--color-text-primary)", lineHeight: "var(--leading-normal)" }}>
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </BrandSection>

              {/* ── Brand Voice ── */}
              {(brandKit.voiceSummary || editingBrand) && (
                <BrandSection label="Brand voice">
                  {editingBrand ? (
                    <textarea
                      defaultValue={brandKit.voiceSummary}
                      rows={4}
                      onBlur={(e) => updateBrandKit({ voiceSummary: e.target.value.trim() })}
                      style={{ width: "100%", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-sans)", resize: "vertical", background: "transparent", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--canva-purple-400)")}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: 1.7, borderLeft: "2px solid var(--canva-purple-200)", paddingLeft: "var(--space-3)", fontStyle: "italic" }}>
                      {brandKit.voiceSummary}
                    </p>
                  )}
                </BrandSection>
              )}

              {/* ── Prohibited ── */}
              {(brandKit.prohibitedElements?.length > 0 || editingBrand) && (
                <BrandSection label="Prohibited" labelColor="var(--color-score-off-brand)">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                    {(Array.isArray(brandKit.prohibitedElements)
                      ? brandKit.prohibitedElements
                      : String(brandKit.prohibitedElements).split(",")
                    ).map((item, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px",
                        background: "var(--color-score-off-bg)",
                        border: "1px solid var(--color-score-off-border)",
                        borderRadius: 99,
                        fontSize: "var(--text-xs)",
                        color: "var(--color-score-off-brand)",
                        lineHeight: 1.4,
                      }}>
                        {capitalize(item.trim())}
                        {editingBrand && (
                          <button
                            onClick={() => updateBrandKit({ prohibitedElements: brandKit.prohibitedElements.filter((_, pi) => pi !== i) })}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-score-off-brand)", fontSize: 12, lineHeight: 1, padding: 0, opacity: 0.7, display: "flex", alignItems: "center" }}
                          >×</button>
                        )}
                      </span>
                    ))}
                    {editingBrand && (
                      <input
                        value={newProhibited}
                        onChange={(e) => setNewProhibited(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newProhibited.trim()) {
                            updateBrandKit({ prohibitedElements: [...brandKit.prohibitedElements, newProhibited.trim()] });
                            setNewProhibited("");
                          }
                        }}
                        placeholder="+ Add item"
                        style={{ fontSize: "var(--text-xs)", border: "1px dashed var(--color-border-default)", borderRadius: 99, padding: "3px 10px", fontFamily: "var(--font-sans)", outline: "none", color: "var(--color-text-muted)", background: "transparent", width: 90 }}
                      />
                    )}
                  </div>
                </BrandSection>
              )}


            </div>
          ) : brandExtracting ? (
            /* Extracting state */
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "var(--space-4)",
              padding: "var(--space-6) var(--space-5)",
            }}>
              <div style={{
                width: 52, height: 52,
                borderRadius: "var(--radius-pill)",
                background: "var(--canva-purple-50)",
                border: "1px solid var(--canva-purple-200)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="canva-loading-dot"
                      style={{ width: 6, height: 6, background: "var(--canva-purple-500)", animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
                  Extracting brand…
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-relaxed)" }}>
                  Reading colors, style, and guidelines from your website.
                </p>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "var(--space-4)",
              padding: "var(--space-6) var(--space-5)",
            }}>
              <div style={{
                width: 52, height: 52,
                borderRadius: "var(--radius-pill)",
                background: "var(--canva-purple-50)",
                border: "1px solid var(--canva-purple-200)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L13.5 7H18L14 11.5L15.5 17L10 14L4.5 17L6 11.5L2 7H6.5L10 2Z" fill="var(--canva-purple-500)" opacity="0.85" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
                  No brand kit yet
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-relaxed)" }}>
                  Add your brand to generate on-brand images and score results automatically.
                </p>
              </div>
              <button
                onClick={() => setShowBrandSetup(true)}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}
              >
                Add brand kit
              </button>
            </div>
          )}
        </div>
        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            panelResizeRef.current = { startX: e.clientX, startWidth: panelWidth };
            document.body.style.cursor = "col-resize";
          }}
          title="Drag to resize panel"
          style={{
            width: 6, flexShrink: 0, cursor: "col-resize",
            background: "transparent", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", zIndex: 5,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(125,42,231,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--canva-gray-300)" }} />
            ))}
          </div>
        </div>

        {/* ── Color picker portal ── */}
        {colorPickerIdx !== null && colorPickerPos && brandKit && typeof document !== "undefined" && createPortal(
          <div
            ref={colorPickerRef}
            style={{
              position: "fixed",
              top: colorPickerPos.y,
              left: colorPickerPos.x,
              zIndex: 9999,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
              padding: 16,
              width: 200,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              border: "1px solid var(--color-border-default)",
            }}
          >
            {/* Large color preview + native picker */}
            <div style={{ position: "relative", width: "100%", height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", background: draftHex }}>
              <input
                type="color"
                value={draftHex.startsWith("#") && draftHex.length === 7 ? draftHex : "#000000"}
                onChange={(e) => setDraftHex(e.target.value)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "crosshair" }}
              />
              <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 10, color: "white", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4, pointerEvents: "none", fontFamily: "var(--font-mono)" }}>
                click to pick
              </div>
            </div>

            {/* Hex input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--color-border-default)", borderRadius: 6, padding: "6px 10px", background: "var(--canva-gray-50)" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>#</span>
              <input
                value={draftHex.replace(/^#/, "")}
                onChange={(e) => {
                  const val = "#" + e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                  setDraftHex(val);
                }}
                maxLength={6}
                placeholder="000000"
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", outline: "none", letterSpacing: "0.05em" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setColorPickerIdx(null); setColorPickerPos(null); }}
                style={{ flex: 1, padding: "6px 0", border: "1px solid var(--color-border-default)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const hex = draftHex.length === 7 ? draftHex : draftHex.length === 4 ? draftHex : null;
                  if (hex && colorPickerIdx !== null) {
                    const updated = brandKit.colors.map((c, i) =>
                      i === colorPickerIdx ? { ...c, hex } : c
                    );
                    updateBrandKit({ colors: updated });
                  }
                  setColorPickerIdx(null);
                  setColorPickerPos(null);
                }}
                style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, background: "var(--canva-purple-500)", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "var(--font-sans)" }}
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}

        </>
        )}{/* end brand panel */}

        {/* ── Layers panel ── */}
        <div className="canva-panel" style={{ width: panelWidth, display: displayedPanel === "layers" ? undefined : "none" }}>
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

      </div>{/* end layers panel */}

        {/* Shared resize handle — shown for any active panel */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            panelResizeRef.current = { startX: e.clientX, startWidth: panelWidth };
            document.body.style.cursor = "col-resize";
          }}
          title="Drag to resize panel"
          style={{
            width: 6, flexShrink: 0, cursor: "col-resize",
            background: "transparent", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", zIndex: 5,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(125,42,231,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--canva-gray-300)" }} />
            ))}
          </div>
        </div>
      </div>{/* end animated panel wrapper */}

      {/* ── Canvas area ── */}
      <div className="canva-canvas-area canva-canvas-area-dots" style={{ position: "relative" }}>

        <div
          ref={canvasSurfaceRef}
          className="canva-canvas-surface"
          style={{ width: CANVAS_W, height: CANVAS_H, position: "relative", userSelect: "none" }}
          onClick={() => selectElement(null)}
        >
          {/* Empty state */}
          {isEmpty && (
            <div
              className="flex flex-col items-center justify-center"
              onClick={(e) => { e.stopPropagation(); openGenerator(); }}
              style={{
                position: "absolute",
                inset: 0,
                gap: "var(--space-3)",
                cursor: "pointer",
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
                transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--canva-purple-50)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--canva-gray-100)")}
              >
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
                        <ScoreCircle score={imageScore} size={28} />
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
                      <ScoreTooltipCard score={imageScore} />
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
});


function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function fmtStr(v: string | undefined) { return v ? capitalize(v.trim()) : ""; }
function fmtArr(v: string[] | string | undefined) {
  if (!v) return "";
  const items = Array.isArray(v) ? v : String(v).split(",");
  return items.map((s) => capitalize(s.trim())).filter(Boolean).join(", ");
}

function BrandSection({ label, labelColor, children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ padding: "var(--space-4) var(--space-4) var(--space-3)" }}>
        <p style={{
          margin: "0 0 var(--space-3)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-bold)",
          color: labelColor ?? "var(--color-text-primary)",
        }}>
          {label}
        </p>
        {children}
      </div>
      <div className="canva-divider" style={{ margin: 0 }} />
    </>
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
