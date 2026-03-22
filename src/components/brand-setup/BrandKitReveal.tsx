"use client";

import { useState } from "react";
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

        {/* Large palette strip */}
        <div style={{ display: "flex", gap: 3, marginBottom: "var(--space-4)", borderRadius: 8, overflow: "hidden" }}>
          {brandKit.colors.map((c, i) => (
            <div key={i} style={{
              flex: 1, height: 48, background: c.hex,
              opacity: revealedCount >= 2 + i ? 1 : 0,
              transition: "opacity 0.2s ease",
            }} />
          ))}
        </div>

        {/* Editable color rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {brandKit.colors.map((color, i) => {
            const visible = revealedCount >= 2 + i;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-3)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
              >
                {/* Swatch */}
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />

                {/* Name + hex editable */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    defaultValue={color.descriptiveName}
                    onBlur={(e) => {
                      const updated = brandKit.colors.map((c, ci) =>
                        ci === i ? { ...c, descriptiveName: e.target.value.trim() } : c
                      );
                      onUpdate({ colors: updated });
                    }}
                    onFocus={focusStyle}
                    placeholder="Colour name"
                    style={{ ...fieldInput, fontWeight: "var(--weight-medium)", marginBottom: 4 }}
                  />
                  <input
                    defaultValue={color.hex}
                    maxLength={7}
                    onBlur={(e) => {
                      let hex = e.target.value.trim();
                      if (!hex.startsWith("#")) hex = "#" + hex;
                      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                        const updated = brandKit.colors.map((c, ci) =>
                          ci === i ? { ...c, hex } : c
                        );
                        onUpdate({ colors: updated });
                      } else {
                        e.target.value = color.hex;
                      }
                    }}
                    onFocus={focusStyle}
                    placeholder="#000000"
                    style={{ ...fieldInput, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)" }}
                  />
                </div>

                {/* Remove */}
                {brandKit.colors.length > 1 && (
                  <button
                    onClick={() => onUpdate({ colors: brandKit.colors.filter((_, ci) => ci !== i) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0, opacity: 0.6 }}
                    title="Remove colour"
                  >×</button>
                )}
              </div>
            );
          })}
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

    </div>
  );
}
