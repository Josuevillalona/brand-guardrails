"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useStore } from "@/store/useStore";
import { GeneratedImage, BrandScore } from "@/types";
import { ImageMode } from "@/lib/image-scorer";
import { ScoreCircle } from "@/components/scoring/ScoreBadge";
import { ScoreTooltipCard } from "@/components/scoring/ScoreTooltipCard";

interface Props {
  onClose: () => void;
  width?: number;
}

let imgSeq = 0;

const IMAGE_MODES: { value: ImageMode; label: string; tooltip: string }[] = [
  { value: "hero",       label: "Hero",       tooltip: "Strict brand enforcement. Color, style, and composition scored to full brand standards." },
  { value: "supporting", label: "Supporting", tooltip: "Balanced enforcement. Subject colors stay natural; brand signals apply to environment and atmosphere." },
  { value: "broll",      label: "B-roll",     tooltip: "Aesthetic feel only. Texture, mood, and lighting scored; composition and palette are flexible." },
];

export function ImageGeneratorPanel({ onClose, width = 260 }: Props) {
  const { brandKit, setShowBrandSetup, addImageElement, updateCanvasImageScore, canvasElements } = useStore();
  const [prompt, setPrompt] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("hero");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<ImageMode | null>(null);
  const [modeTooltipPos, setModeTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const modeHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Maps generated image id → canvas element id (set when user places image before scoring finishes)
  const placedCanvasIds = useRef<Map<string, string>>(new Map());
  // Override reason modal
  const [overrideImg, setOverrideImg] = useState<GeneratedImage | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  async function generate(
    userPrompt: string,
    isAlternative = false,
    failingDimension: string | null = null,
    scoreIssues?: string[],
    scoreExplanation?: string
  ) {
    if (!userPrompt.trim()) return;
    setGenerating(true);
    setGeneratingAlt(isAlternative);
    setGenError(null);
    try {
      // Same FLUX model for both paths — brand context is the only variable.
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt, brandKit, count: 2, isAlternative, failingDimension, imageMode, scoreIssues, scoreExplanation }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error === "rate_limited") {
        throw new Error("Slow down a little — too many requests at once. Wait a couple seconds and try again.");
      }
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const hasBrand = !!brandKit;
      const newImages: GeneratedImage[] = (data.imageUrls as string[]).map((url) => ({
        id: `img-${Date.now()}-${imgSeq++}`,
        imageUrl: url,
        prompt: data.assembledPrompt,
        userPrompt: data.userPrompt,
        score: null,
        scorePending: hasBrand,
        noBrandContext: !hasBrand,
      }));

      setImages((prev) => [...newImages, ...prev]);

      if (hasBrand) {
        newImages.forEach((img) => scoreImage(img.id, img.imageUrl, userPrompt, imageMode));
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGeneratingAlt(false);
    }
  }

  async function scoreImage(id: string, imageUrl: string, userPrompt: string, mode: ImageMode) {
    if (!brandKit) return;
    try {
      const res = await fetch("/api/score-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, brandKit, userPrompt, imageMode: mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const score: BrandScore = data.score;
      setImages((prev) =>
        prev.map((img) => img.id === id ? { ...img, score, scorePending: false } : img)
      );
      // If user already placed this image on canvas, push score there too
      const canvasId = placedCanvasIds.current.get(id);
      if (canvasId) updateCanvasImageScore(canvasId, score);
    } catch {
      setImages((prev) =>
        prev.map((img) => img.id === id ? { ...img, scorePending: false } : img)
      );
    }
  }

  function placeOnCanvas(img: GeneratedImage) {
    // Off-brand images require an override reason before placing
    if (img.score?.label === "off-brand") {
      setOverrideImg(img);
      setOverrideReason("");
      return;
    }
    commitPlace(img);
  }

  function commitPlace(img: GeneratedImage, reason?: string) {
    const existingImages = canvasElements.filter((el) => el.type === "image");
    const offset = existingImages.length * 20;
    const canvasId = addImageElement({
      type: "image",
      x: 60 + offset,
      y: 60 + offset,
      width: 320,
      height: 320,
      imageUrl: img.imageUrl,
      prompt: img.prompt,
      score: img.score,
      scorePending: img.scorePending,
      overrideReason: reason,
    });
    // Track mapping so scoreImage can push results back if scoring finishes later
    if (img.scorePending) placedCanvasIds.current.set(img.id, canvasId);
  }

  return (
    <div
      className="canva-panel"
      style={{ width, minWidth: 220, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── Header ── */}
      <div className="canva-panel-header" style={{ flexShrink: 0 }}>
        <p style={{
          margin: 0,
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-bold)",
          color: "var(--color-text-primary)",
        }}>
          Generate image
        </p>
      </div>


      {/* ── Canva-style top input block — always pinned below header ── */}
      <div style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>

        {/* Bordered prompt input with inline submit arrow — mirrors Canva search box */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          border: "1.5px solid",
          borderColor: "var(--canva-purple-400)",
          borderRadius: "var(--radius-lg)",
          background: "#fff",
          overflow: "hidden",
          boxShadow: "0 0 0 3px var(--canva-purple-50)",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                images.length > 0 ? generate(prompt || images[0].userPrompt) : generate(prompt);
              }
            }}
            placeholder="Describe the image you want…"
            rows={2}
            disabled={generating}
            style={{
              resize: "none",
              border: "none",
              outline: "none",
              padding: "10px 12px 6px",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-primary)",
              lineHeight: "var(--leading-normal)",
              background: "transparent",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          {/* Bottom row: brand kit indicator + submit button */}
          <div style={{ display: "flex", alignItems: "center", padding: "4px 8px 8px", gap: "var(--space-2)" }}>
            {/* Brand context pill */}
            {brandKit ? (
              <button
                onClick={() => setShowBrandSetup(true)}
                title={brandKit.companyName}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "var(--canva-purple-50)", border: "1px solid var(--canva-purple-200)",
                  borderRadius: "var(--radius-pill)", padding: "2px 8px 2px 4px",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {brandKit.colors.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c.hex }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: "var(--canva-purple-600)", fontFamily: "var(--font-sans)", fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {brandKit.companyName}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowBrandSetup(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "1px dashed var(--canva-purple-200)",
                  borderRadius: "var(--radius-pill)", padding: "2px 8px",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="var(--canva-purple-400)" />
                </svg>
                <span style={{ fontSize: 10, color: "var(--canva-purple-500)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                  Add brand kit
                </span>
              </button>
            )}
            <div style={{ flex: 1 }} />
            {/* Submit arrow button */}
            <button
              onClick={() => images.length > 0 ? generate(prompt || images[0].userPrompt) : generate(prompt)}
              disabled={generating || (!prompt.trim() && images.length === 0)}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: (generating || (!prompt.trim() && images.length === 0)) ? "var(--canva-gray-200)" : "var(--canva-purple-500)",
                border: "none", cursor: (generating || (!prompt.trim() && images.length === 0)) ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              {generating ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 12L12 2M12 2H5M12 2V9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mode tabs — Templates | Layouts | Styles style */}
        {brandKit && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--color-border-subtle)", margin: "0 -2px" }}>
            {IMAGE_MODES.map((mode) => {
              const isSelected = imageMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setImageMode(mode.value)}
                  onMouseEnter={(e) => {
                    if (modeHoverTimer.current) clearTimeout(modeHoverTimer.current);
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    modeHoverTimer.current = setTimeout(() => {
                      setModeTooltipPos({ x: r.left + r.width / 2, y: r.top });
                      setHoveredMode(mode.value);
                    }, 300);
                  }}
                  onMouseLeave={() => {
                    if (modeHoverTimer.current) clearTimeout(modeHoverTimer.current);
                    setHoveredMode(null); setModeTooltipPos(null);
                  }}
                  style={{
                    flex: 1, padding: "6px 4px", border: "none", background: "none",
                    fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)",
                    fontWeight: isSelected ? "var(--weight-bold)" : "var(--weight-medium)",
                    color: isSelected ? "var(--canva-purple-600)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    borderBottom: isSelected ? "2px solid var(--canva-purple-500)" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Mode callout */}
        {brandKit && (
          <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            {imageMode === "hero" && "Strict brand scoring — color, render style, composition, and mood."}
            {imageMode === "supporting" && "Brand atmosphere only — subject colors stay natural."}
            {imageMode === "broll" && "Texture, mood, and lighting scored — composition is flexible."}
          </p>
        )}

        {genError && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-score-off-bg)", border: "1px solid var(--color-score-off-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <svg style={{ flexShrink: 0, marginTop: 1 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-score-off-brand)", lineHeight: "var(--leading-relaxed)" }}>
              {genError}
            </p>
          </div>
        )}
      </div>

      {/* ── Scrollable results area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3)" }}>

        {/* Image grid */}
        {(images.length > 0 || generating) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "var(--space-2)" }}>
            {generating && [0, 1].map((i) => (
              <div key={`skel-${i}`} style={{ aspectRatio: "1", borderRadius: "var(--radius-lg)", background: "var(--canva-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}>
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.3}s` }} />
              </div>
            ))}
            {images.slice(0, Math.floor(width / 110) * 2).map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onPlace={() => placeOnCanvas(img)}
                onPlaceDirect={() => commitPlace(img)}
                onGetAlternative={() => generate(
                  img.userPrompt,
                  true,
                  img.score?.failingDimension ?? null,
                  img.score?.issues ?? undefined,
                  img.score?.explanation ?? undefined
                )}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && !generating && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "var(--space-3)", paddingBottom: "var(--space-8)", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-pill)", background: "var(--canva-purple-50)", border: "1px solid var(--canva-purple-200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--canva-purple-500)" }}>
              ✦
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-relaxed)", maxWidth: 180 }}>
              {brandKit
                ? "Describe an image above — it'll be generated and scored against your brand kit"
                : "Describe an image above. Add a brand kit to enable brand scoring."}
            </p>
          </div>
        )}
      </div>

      {/* Back link */}
      <div style={{ padding: "var(--space-2) var(--space-3)", borderTop: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontFamily: "var(--font-sans)", padding: 0, transition: "color var(--transition-fast)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          ← Go back
        </button>
      </div>

      {/* ── Off-brand override reason modal ── */}
      {overrideImg && createPortal(
        <div
          onClick={() => setOverrideImg(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              width: 320,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                background: "rgba(239,68,68,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
                  Off-brand image
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-relaxed)" }}>
                  This image scored below brand thresholds. Provide a reason to continue.
                </p>
              </div>
            </div>

            {/* Reason textarea */}
            <textarea
              autoFocus
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Approved by brand team for campaign exception"
              rows={3}
              style={{
                width: "100%",
                fontSize: "var(--text-xs)",
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: "var(--leading-relaxed)",
                marginBottom: "var(--space-4)",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--canva-purple-400)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border-default)")}
            />

            {/* Actions */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                onClick={() => setOverrideImg(null)}
                style={{
                  flex: 1, padding: "7px 0",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-medium)",
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={() => {
                  commitPlace(overrideImg, overrideReason.trim());
                  setOverrideImg(null);
                  setOverrideReason("");
                }}
                style={{
                  flex: 1, padding: "7px 0",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  background: overrideReason.trim() ? "#ef4444" : "var(--color-bg-subtle)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-medium)",
                  fontFamily: "var(--font-sans)",
                  color: overrideReason.trim() ? "#fff" : "var(--color-text-muted)",
                  cursor: overrideReason.trim() ? "pointer" : "default",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                Place anyway
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── (PromptControls removed — logic inlined into main panel) ────────────────

interface PromptControlsProps {
  prompt: string;
  setPrompt: (v: string) => void;
  generating: boolean;
  genError: string | null;
  brandKit: boolean;
  imageMode: ImageMode;
  setImageMode: (m: ImageMode) => void;
  hoveredMode: ImageMode | null;
  setHoveredMode: (m: ImageMode | null) => void;
  modeTooltipPos: { x: number; y: number } | null;
  setModeTooltipPos: (p: { x: number; y: number } | null) => void;
  modeHoverTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  hasImages: boolean;
  onGenerate: () => void;
  onClose: () => void;
  onAddBrand: () => void;
  showAddBrand: boolean;
}

function PromptControls({
  prompt, setPrompt, generating, genError, brandKit,
  imageMode, setImageMode,
  hoveredMode, setHoveredMode, modeTooltipPos, setModeTooltipPos, modeHoverTimer,
  hasImages, onGenerate, onClose, onAddBrand, showAddBrand,
}: PromptControlsProps) {
  return (
    <>
      {showAddBrand && (
        <button
          onClick={onAddBrand}
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)",
            width: "100%", padding: "var(--space-2) var(--space-3)",
            background: "var(--canva-purple-50)", border: "1px solid var(--canva-purple-200)",
            borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--canva-purple-100)"; e.currentTarget.style.borderColor = "var(--canva-purple-400)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--canva-purple-50)"; e.currentTarget.style.borderColor = "var(--canva-purple-200)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="var(--canva-purple-500)" />
          </svg>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--canva-purple-600)", fontWeight: "var(--weight-medium)", lineHeight: 1 }}>
            Add a brand kit to score and guide generations
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto", flexShrink: 0 }}>
            <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="var(--canva-purple-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onGenerate(); }
        }}
        placeholder="Describe the image you want…"
        rows={3}
        disabled={generating}
        className="canva-input"
        style={{ resize: "none", lineHeight: "var(--leading-normal)", width: "100%", fontSize: "var(--text-sm)" }}
      />

      {genError && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          background: "var(--color-score-off-bg)", border: "1px solid var(--color-score-off-border)",
          borderRadius: "var(--radius-md)",
        }}>
          <svg style={{ flexShrink: 0, marginTop: 1 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-score-off-brand)", lineHeight: "var(--leading-relaxed)" }}>
            {genError}
          </p>
        </div>
      )}

      {brandKit && (
        <div style={{ display: "flex", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-default)" }}>
          {IMAGE_MODES.map((mode, i) => {
            const isSelected = imageMode === mode.value;
            const isFirst = i === 0;
            const isLast = i === IMAGE_MODES.length - 1;
            return (
              <button
                key={mode.value}
                onClick={() => setImageMode(mode.value)}
                style={{
                  position: "relative", flex: 1,
                  padding: "var(--space-1) var(--space-1)", border: "none",
                  borderLeft: i > 0 ? "1px solid var(--color-border-default)" : "none",
                  borderRadius: isFirst ? "calc(var(--radius-md) - 1px) 0 0 calc(var(--radius-md) - 1px)" : isLast ? "0 calc(var(--radius-md) - 1px) calc(var(--radius-md) - 1px) 0" : 0,
                  background: isSelected ? "var(--canva-purple-500)" : "transparent",
                  color: isSelected ? "var(--color-text-on-accent)" : "var(--color-text-secondary)",
                  fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}
              >
                {mode.label}
                <span
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    if (modeHoverTimer.current) clearTimeout(modeHoverTimer.current);
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    modeHoverTimer.current = setTimeout(() => {
                      setModeTooltipPos({ x: r.left + r.width / 2, y: r.top });
                      setHoveredMode(mode.value);
                    }, 300);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (modeHoverTimer.current) clearTimeout(modeHoverTimer.current);
                    setHoveredMode(null); setModeTooltipPos(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 11, lineHeight: 1, color: isSelected ? "rgba(255,255,255,0.7)" : "#a0a0a0", marginLeft: 1, cursor: "default", flexShrink: 0 }}
                >
                  ⓘ
                </span>
              </button>
            );
          })}
        </div>
      )}

      {brandKit && (
        <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.5, letterSpacing: "0.01em" }}>
          {imageMode === "hero" && "Scores color, render style, composition, and mood at full brand standards."}
          {imageMode === "supporting" && "Scores brand atmosphere; subject colors stay natural and realistic."}
          {imageMode === "broll" && "Scores texture, mood, and lighting only — composition is flexible."}
        </p>
      )}

      <button
        onClick={onGenerate}
        disabled={generating || (!prompt.trim() && !hasImages)}
        className="btn-ai"
        style={{ width: "100%", justifyContent: "center" }}
      >
        {generating ? "Generating…" : hasImages ? "✦ Generate again" : "✦ Generate"}
      </button>

      <button
        onClick={onClose}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "var(--text-xs)", color: "var(--color-text-muted)",
          fontFamily: "var(--font-sans)", padding: "var(--space-1) 0",
          textAlign: "center", width: "100%", transition: "color var(--transition-fast)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
      >
        ← Go back
      </button>

      {hoveredMode && modeTooltipPos && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed", left: modeTooltipPos.x, top: modeTooltipPos.y - 8,
          transform: "translate(-50%, -100%)",
          background: "var(--color-text-primary)", color: "#fff",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 6,
          width: 200, pointerEvents: "none", zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.22)", textAlign: "left",
          fontFamily: "var(--font-sans)", fontWeight: 400,
        }}>
          {IMAGE_MODES.find(m => m.value === hoveredMode)?.tooltip}
        </div>,
        document.body
      )}
    </>
  );
}

const DIM_LABELS_SHORT: Record<string, string> = {
  colorAlignment:  "Color match",
  renderStyleMatch: "Render style",
  moodLighting:    "Mood & lighting",
  compositionFit:  "Composition",
  overallCohesion: "Overall feel",
};


function ImageCard({
  image,
  onPlace,
  onPlaceDirect,
  onGetAlternative,
}: {
  image: GeneratedImage;
  onPlace: () => void;
  onPlaceDirect: () => void;
  onGetAlternative: () => void;
}) {
  const score = image.score;
  const prohibited = score && !score.dimensions.noProhibited;
  const isOnBrand  = score?.label === "on-brand";
  const failLabel  = score?.failingDimension ? DIM_LABELS_SHORT[score.failingDimension] : "alignment";

  // Portal tooltip — rendered at document.body so panel overflow:hidden can't clip it
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // After tooltip renders, measure its actual height and clamp to viewport
  useEffect(() => {
    if (!showTooltip || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom > vh - 8) {
      setTooltipPos(prev => ({ ...prev, top: Math.max(8, vh - rect.height - 8) }));
    }
  }, [showTooltip]);

  function showDelayed() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      if (badgeRef.current) {
        const r = badgeRef.current.getBoundingClientRect();
        const TOOLTIP_W = 260;
        const vw = window.innerWidth;

        // Prefer right of badge; fall back to left if it would overflow
        const left = r.right + 10 + TOOLTIP_W > vw
          ? r.left - TOOLTIP_W - 10
          : r.right + 10;

        // Start top-aligned to badge — useEffect will clamp after render
        setTooltipPos({ top: r.top, left });
      }
      setShowTooltip(true);
    }, 300);
  }
  function hide() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
  }

  return (
    <>
    <div className="canva-card">
      {/* Score breakdown tooltip — portaled to body, position: fixed */}
      {score && showTooltip && typeof document !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          onMouseEnter={() => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }}
          onMouseLeave={hide}
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 260,
            zIndex: 9999,
            background: "var(--color-bg-surface)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--color-border-subtle)",
            transition: "opacity var(--transition-fast)",
          }}
        >
          <ScoreTooltipCard score={score} />
        </div>,
        document.body
      )}

      {/* Image */}
      <div style={{
        position: "relative",
        aspectRatio: "1",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        overflow: "hidden",
      }}>
        <Image
          src={image.imageUrl}
          alt={image.userPrompt}
          fill
          style={{ objectFit: "cover" }}
          unoptimized
        />

        {/* Badge overlay — top-left, hover triggers portal tooltip */}
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          {image.noBrandContext ? (
            <span className="score-badge-neutral">No brand</span>
          ) : image.scorePending ? (
            <span className="shimmer-pill">Analyzing…</span>
          ) : score ? (
            <div ref={badgeRef} onMouseEnter={showDelayed} onMouseLeave={hide} style={{ cursor: "default", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
              <ScoreCircle score={score} size={28} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Scoring skeleton bars — brand images while score is in flight */}
      {!image.noBrandContext && image.scorePending && (
        <div style={{ padding: "var(--space-2) var(--space-2) var(--space-1)", borderTop: "1px solid var(--color-border-subtle)" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer-bar"
              style={{
                height: 4,
                borderRadius: "var(--radius-pill)",
                marginBottom: i < 2 ? "var(--space-1)" : 0,
                width: `${88 - i * 16}%`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        padding: "var(--space-1) var(--space-2) var(--space-2)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}>
        {(prohibited || (score && !isOnBrand)) ? (
          <>
            <button
              onClick={onGetAlternative}
              className="btn-ai"
              style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)", padding: "6px 8px" }}
              title={prohibited ? "Re-generate avoiding prohibited elements" : `Improve ${failLabel}`}
            >
              ✦ Generate alternative
            </button>
            <button
              onClick={onPlaceDirect}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--color-text-muted)", fontFamily: "var(--font-sans)", padding: "2px 0", textAlign: "center", width: "100%" }}
            >
              Use anyway
            </button>
          </>
        ) : (
          <button onClick={onPlace} className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}>
            Use this image
          </button>
        )}
      </div>
    </div>
    </>
  );
}
