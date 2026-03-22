"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandKit } from "@/types";

interface BrandKitRevealProps {
  brandKit: BrandKit;
  revealedCount: number;
  revealVisual: number;
  revealVoice: number;
  onUpdate: (partial: Partial<BrandKit>) => void;
}

function RevealItem({
  visible,
  children,
  style,
}: {
  visible: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.24s ease, transform 0.24s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Shared styles
const sectionCard: React.CSSProperties = {
  padding: "var(--space-4) var(--space-5)",
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
};
const sectionLabel: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: "var(--weight-medium)",
  color: "var(--color-text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "var(--space-3)",
};
const fieldInput: React.CSSProperties = {
  width: "100%",
  fontSize: "var(--text-xs)",
  color: "var(--color-text-primary)",
  border: "none",
  borderBottom: "1px solid var(--color-border-default)",
  background: "transparent",
  outline: "none",
  fontFamily: "var(--font-sans)",
  padding: "2px 0",
  lineHeight: "var(--leading-normal)",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
};

export function BrandKitReveal({
  brandKit,
  revealedCount,
  revealVisual,
  revealVoice,
  onUpdate,
}: BrandKitRevealProps) {
  const [newProhibited, setNewProhibited] = useState("");
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [draftHex, setDraftHex] = useState("");
  const colorPickerRef = useRef<HTMLDivElement>(null);

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

  const showName   = revealedCount >= 1;
  const showVisual = revealedCount >= revealVisual;
  const showVoice  = revealedCount >= revealVoice;

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "var(--canva-purple-400)";
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "var(--color-border-default)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* ── Company name ── */}
      <RevealItem visible={showName}>
        <div style={sectionCard}>
          <p style={{ ...sectionLabel, marginBottom: "var(--space-2)" }}>Company</p>
          <input
            defaultValue={brandKit.companyName}
            onBlur={(e) => onUpdate({ companyName: e.target.value.trim() })}
            onFocus={focusStyle}
            style={{ ...fieldInput, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)" }}
          />
        </div>
      </RevealItem>

      {/* ── Colors ── */}
      <div style={{
        ...sectionCard,
        opacity: revealedCount >= 2 ? 1 : 0,
        transform: revealedCount >= 2 ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.24s ease, transform 0.24s ease",
      }}>
        <p style={sectionLabel}>Brand Colours</p>

        {/* Clickable palette strip — each tile opens the color picker */}
        <div style={{ display: "flex", gap: 3, borderRadius: 8, overflow: "hidden" }}>
          {brandKit.colors.map((c, i) => (
            <button
              key={i}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setColorPickerIdx(i);
                setDraftHex(c.hex);
                setColorPickerPos({ x: r.left, y: r.bottom + 6 });
              }}
              title={c.hex}
              style={{
                flex: 1, height: 52, background: c.hex,
                border: "none", padding: 0, cursor: "pointer",
                opacity: revealedCount >= 2 + i ? 1 : 0,
                transition: "opacity 0.2s ease, filter 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.88)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}
            />
          ))}
        </div>
      </div>

      {/* ── Visual style ── */}
      <RevealItem visible={showVisual}>
        <div style={sectionCard}>
          <p style={sectionLabel}>Visual Style</p>

          {/* Render style + mood pills row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <input
              defaultValue={brandKit.renderStyle}
              onBlur={(e) => onUpdate({ renderStyle: e.target.value.trim() as BrandKit["renderStyle"] })}
              onFocus={focusStyle}
              placeholder="Render style"
              style={{ ...fieldInput, width: "auto", flex: 1, minWidth: 100, background: "var(--canva-purple-50)", borderBottom: "1px solid var(--canva-purple-200)", borderRadius: "var(--radius-pill)", padding: "2px 12px", color: "var(--canva-purple-600)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-xs)" }}
            />
            <input
              defaultValue={brandKit.moodAdjectives.join(", ")}
              onBlur={(e) => onUpdate({ moodAdjectives: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              onFocus={focusStyle}
              placeholder="Mood adjectives (comma separated)"
              style={{ ...fieldInput, flex: 2, minWidth: 140, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}
            />
          </div>

          {/* Technical details grid — all editable */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)" }}>
            {([
              ["Lighting",      `${brandKit.lightingStyle}`,         (v: string) => onUpdate({ lightingStyle: v })],
              ["Shot type",     brandKit.shotType,                    (v: string) => onUpdate({ shotType: v as BrandKit["shotType"] })],
              ["Depth of field",brandKit.depthOfField,                (v: string) => onUpdate({ depthOfField: v })],
              ["Camera angle",  brandKit.cameraAngle,                 (v: string) => onUpdate({ cameraAngle: v })],
              ["Color grade",   brandKit.colorGrade,                  (v: string) => onUpdate({ colorGrade: v })],
              ["Environment",   brandKit.environmentalContext,        (v: string) => onUpdate({ environmentalContext: v })],
            ] as [string, string, (v: string) => void][]).map(([label, value, save]) => (
              <div key={label}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: 3 }}>{label}</p>
                <input
                  defaultValue={value}
                  onBlur={(e) => save(e.target.value.trim())}
                  onFocus={focusStyle}
                  style={{ ...fieldInput, fontWeight: "var(--weight-medium)", color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </RevealItem>

      {/* ── Brand Voice & Prohibited ── */}
      <RevealItem visible={showVoice}>
        <div style={sectionCard}>
          <p style={{ ...sectionLabel, marginBottom: "var(--space-2)" }}>Brand Voice</p>
          <textarea
            defaultValue={brandKit.voiceSummary}
            rows={3}
            onBlur={(e) => onUpdate({ voiceSummary: e.target.value.trim() })}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--canva-purple-400)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-border-default)")}
            style={{ width: "100%", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6, border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-sans)", resize: "vertical", background: "transparent", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s", marginBottom: "var(--space-4)" }}
          />

          {/* Prohibited */}
          <p style={{ ...sectionLabel, marginBottom: "var(--space-2)" }}>Avoid</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {brandKit.prohibitedElements.map((el, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "var(--color-score-off-bg)", color: "var(--color-score-off-brand)", border: "1px solid var(--color-score-off-border)", borderRadius: 99, fontSize: "var(--text-xs)" }}>
                {el}
                <button
                  onClick={() => onUpdate({ prohibitedElements: brandKit.prohibitedElements.filter((_, pi) => pi !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 12, lineHeight: 1, padding: 0, opacity: 0.7 }}
                >×</button>
              </span>
            ))}
            <input
              value={newProhibited}
              onChange={(e) => setNewProhibited(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProhibited.trim()) {
                  onUpdate({ prohibitedElements: [...brandKit.prohibitedElements, newProhibited.trim()] });
                  setNewProhibited("");
                }
              }}
              placeholder="+ Add"
              style={{ fontSize: "var(--text-xs)", border: "1px dashed var(--color-border-default)", borderRadius: 99, padding: "3px 10px", fontFamily: "var(--font-sans)", outline: "none", color: "var(--color-text-muted)", background: "transparent", width: 70, transition: "border-color 0.15s" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--canva-purple-400)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--color-border-default)")}
            />
          </div>
        </div>
      </RevealItem>

      {/* ── Color picker portal ── */}
      {colorPickerIdx !== null && colorPickerPos && typeof document !== "undefined" && createPortal(
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--color-border-default)", borderRadius: 6, padding: "6px 10px", background: "var(--canva-gray-50)" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>#</span>
            <input
              value={draftHex.replace(/^#/, "")}
              onChange={(e) => setDraftHex("#" + e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", outline: "none", letterSpacing: "0.05em" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setColorPickerIdx(null); setColorPickerPos(null); }}
              style={{ flex: 1, padding: "6px 0", border: "1px solid var(--color-border-default)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
            >Cancel</button>
            <button
              onClick={() => {
                if (draftHex.length === 7 && colorPickerIdx !== null) {
                  onUpdate({ colors: brandKit.colors.map((c, ci) => ci === colorPickerIdx ? { ...c, hex: draftHex } : c) });
                }
                setColorPickerIdx(null);
                setColorPickerPos(null);
              }}
              style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, background: "var(--canva-purple-500)", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "var(--font-sans)" }}
            >Apply</button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
