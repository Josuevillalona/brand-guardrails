"use client";

import { useState, useRef } from "react";
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

const IMAGE_MODES: { value: ImageMode; label: string; description: string }[] = [
  { value: "hero",       label: "Hero",       description: "Campaign & key brand imagery — full enforcement" },
  { value: "supporting", label: "Supporting",  description: "Food, lifestyle, objects — aesthetic fit, natural subject colors" },
  { value: "broll",      label: "B-roll",      description: "Texture, detail, abstract — mood & atmosphere only" },
];

export function ImageGeneratorPanel({ onClose, width = 260 }: Props) {
  const { brandKit, setShowBrandSetup, addImageElement, updateCanvasImageScore, canvasElements } = useStore();
  const [prompt, setPrompt] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("supporting");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  // Maps generated image id → canvas element id (set when user places image before scoring finishes)
  const placedCanvasIds = useRef<Map<string, string>>(new Map());

  async function generate(
    userPrompt: string,
    isAlternative = false,
    failingDimension: string | null = null
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
        body: JSON.stringify({ userPrompt, brandKit, count: 2, isAlternative, failingDimension }),
      });
      const data = await res.json();
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


      {/* ── Brand context row (brand-active only) ── */}
      {brandKit && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-4)",
          background: "var(--canva-gray-50)",
          borderBottom: "1px solid var(--color-border-default)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {brandKit.colors.slice(0, 3).map((c, i) => (
              <div
                key={i}
                title={c.descriptiveName}
                className="canva-swatch"
                style={{ width: 12, height: 12, background: c.hex }}
              />
            ))}
          </div>
          <span style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-medium)",
            color: "var(--color-text-primary)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {brandKit.companyName}
          </span>
          <span className="canva-pill" style={{
            background: "var(--canva-purple-50)",
            border: "1px solid var(--canva-purple-200)",
            color: "var(--canva-purple-600)",
            fontSize: "var(--text-xs)",
          }}>
            active
          </span>
        </div>
      )}

      {/* ── Scrollable middle — image results only ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3) var(--space-3) 0" }}>

        {/* Image grid — skeletons prepended during alternative generation, hidden during fresh generation */}
        {(images.length > 0 || generating) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>

            {/* Skeleton placeholders — top of grid when generating */}
            {generating && [0, 1].map((i) => (
              <div
                key={`skel-${i}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--canva-gray-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-1)",
                }}
              >
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.3}s` }} />
              </div>
            ))}

            {/* Existing images — hidden during new-prompt generation, visible during alternative */}
            {(!generating || generatingAlt) && images.slice(0, Math.floor(width / 110) * 2).map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onPlace={() => placeOnCanvas(img)}
                onGetAlternative={() => generate(img.userPrompt, true, img.score?.failingDimension ?? null)}
              />
            ))}
          </div>
        )}

        {/* Empty state — before first generation */}
        {images.length === 0 && !generating && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-8) var(--space-4)",
            gap: "var(--space-3)",
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-pill)",
              background: "var(--canva-purple-50)",
              border: "1px solid var(--canva-purple-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "var(--canva-purple-500)",
            }}>
              ✦
            </div>
            <p style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              textAlign: "center",
              lineHeight: "var(--leading-relaxed)",
              margin: 0,
            }}>
              {brandKit
                ? "Describe an image — it'll be generated and scored against your brand kit"
                : "Describe an image to get started. Add a brand kit to enable scoring."}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom — prompt input + actions ── */}
      <div style={{
        padding: "var(--space-3)",
        borderTop: "1px solid var(--color-border-subtle)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}>
        {!brandKit && (
          <button
            onClick={() => setShowBrandSetup(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--canva-purple-50)",
              border: "1px solid var(--canva-purple-200)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--canva-purple-100)";
              e.currentTarget.style.borderColor = "var(--canva-purple-400)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--canva-purple-50)";
              e.currentTarget.style.borderColor = "var(--canva-purple-200)";
            }}
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              generate(prompt);
            }
          }}
          placeholder="Describe the image you want…"
          rows={3}
          disabled={generating}
          className="canva-input"
          style={{ resize: "none", lineHeight: "var(--leading-normal)", width: "100%", fontSize: "var(--text-sm)" }}
        />

        {genError && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-score-off-brand)", margin: 0 }}>
            {genError}
          </p>
        )}

        {/* Intent selector — brand-active only */}
        {brandKit && (
          <div style={{
            display: "flex",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1px solid var(--color-border-default)",
          }}>
            {IMAGE_MODES.map((mode, i) => (
              <button
                key={mode.value}
                onClick={() => setImageMode(mode.value)}
                title={mode.description}
                style={{
                  flex: 1,
                  padding: "var(--space-1) var(--space-1)",
                  border: "none",
                  borderLeft: i > 0 ? `1px solid var(--color-border-default)` : "none",
                  background: imageMode === mode.value ? "var(--canva-purple-500)" : "transparent",
                  color: imageMode === mode.value ? "var(--color-text-on-accent)" : "var(--color-text-secondary)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-medium)",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => images.length > 0 ? generate(prompt || images[0].userPrompt) : generate(prompt)}
          disabled={generating || (!prompt.trim() && images.length === 0)}
          className="btn-ai"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {generating ? "Generating…" : images.length > 0 ? "✦ Generate again" : "✦ Generate"}
        </button>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-sans)",
            padding: "var(--space-1) 0",
            textAlign: "center",
            width: "100%",
            transition: "color var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          ← Go back
        </button>
      </div>
    </div>
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
  onGetAlternative,
}: {
  image: GeneratedImage;
  onPlace: () => void;
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

  function showDelayed() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      if (badgeRef.current) {
        const r = badgeRef.current.getBoundingClientRect();
        setTooltipPos({ top: r.top, left: r.right + 10 });
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

      {/* Static explanation row — always visible once scored */}
      {score && !image.scorePending && (
        <div style={{ padding: "var(--space-1) var(--space-2)", borderTop: "1px solid var(--color-border-subtle)" }}>
          <span style={{
            display: "block",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {score.explanation}
          </span>
        </div>
      )}

      {/* Actions — stacked layout for narrow cards */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        padding: "var(--space-1) var(--space-2) var(--space-2)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}>
        {isOnBrand ? (
          <button onClick={onPlace} className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}>
            Use this image
          </button>
        ) : prohibited ? (
          <>
            <button
              onClick={onGetAlternative}
              className="btn-ai"
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "var(--text-xs)",
                whiteSpace: "normal",
                lineHeight: 1.3,
                height: "auto",
                minHeight: 28,
                padding: "6px 8px",
                textAlign: "center",
              }}
              title="Re-generate avoiding prohibited elements"
            >
              ✦ Regenerate
            </button>
            <button
              onClick={onPlace}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-sans)",
                padding: "2px 0",
                textAlign: "center",
              }}
            >
              Use anyway
            </button>
          </>
        ) : score ? (
          <>
            <button
              onClick={onGetAlternative}
              className="btn-ai"
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "var(--text-xs)",
                whiteSpace: "normal",
                lineHeight: 1.3,
                height: "auto",
                minHeight: 28,
                padding: "6px 8px",
                textAlign: "center",
              }}
              title={`Improve ${failLabel}`}
            >
              ✦ Generate alternative
            </button>
            <button
              onClick={onPlace}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-sans)",
                padding: "2px 0",
                textAlign: "center",
              }}
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
