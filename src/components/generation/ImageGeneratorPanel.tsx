"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useStore } from "@/store/useStore";
import { GeneratedImage, BrandScore } from "@/types";
import { ImageMode } from "@/lib/image-scorer";
import { ScoreBadge } from "@/components/scoring/ScoreBadge";
import { DimensionBreakdown } from "@/components/scoring/DimensionBreakdown";

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
  const { brandKit, addImageElement, canvasElements } = useStore();
  const [prompt, setPrompt] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("supporting");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate(
    userPrompt: string,
    isAlternative = false,
    failingDimension: string | null = null
  ) {
    if (!userPrompt.trim()) return;
    setGenerating(true);
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
    } catch {
      setImages((prev) =>
        prev.map((img) => img.id === id ? { ...img, scorePending: false } : img)
      );
    }
  }

  function placeOnCanvas(img: GeneratedImage) {
    const existingImages = canvasElements.filter((el) => el.type === "image");
    const offset = existingImages.length * 20;
    addImageElement({
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
    // Panel stays open — user can place multiple images or keep browsing
  }

  return (
    <div
      className="canva-panel"
      style={{ width, minWidth: 220, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── Header ── */}
      <div className="canva-panel-header" style={{ padding: "12px 16px", flexShrink: 0 }}>
        <p className="canva-panel-label" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
          Generate image
        </p>
      </div>

      {/* ── Brand context row (brand-active only) ── */}
      {brandKit && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          background: "#f9f9f9",
          borderBottom: "1px solid #ebebeb",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 3 }}>
            {brandKit.colors.slice(0, 3).map((c, i) => (
              <div
                key={i}
                title={c.descriptiveName}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: c.hex,
                  border: "1px solid rgba(0,0,0,0.1)",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#3d3d3d", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {brandKit.companyName}
          </span>
          <span style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 100,
            background: "#f0f2ff",
            border: "1px solid #d4b3fb",
            color: "#6620c4",
            fontWeight: 500,
            flexShrink: 0,
          }}>
            active
          </span>
        </div>
      )}

      {/* ── Scrollable middle — image results only ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 0" }}>

        {/* Generation loading skeleton — adapts columns to panel width */}
        {generating && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--canva-gray-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
                <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.3}s` }} />
              </div>
            ))}
          </div>
        )}

        {/* Image grid — auto-fill columns, newest 4 images */}
        {images.length > 0 && !generating && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 12 }}>
            {images.slice(0, Math.floor(width / 110) * 2).map((img) => (
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
            padding: "32px 16px",
            gap: 8,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--canva-gray-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "var(--color-text-muted)",
            }}>
              ✦
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.4, margin: 0 }}>
              {brandKit
                ? "Describe an image — it'll be generated and scored against your brand kit"
                : "Describe an image to get started. Add a brand kit to enable scoring."}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom — prompt input + actions ── */}
      <div style={{
        padding: "12px 12px 12px",
        borderTop: "1px solid var(--color-border-subtle)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
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
          style={{ resize: "none", lineHeight: 1.5, width: "100%", fontSize: "var(--text-sm)" }}
        />

        {genError && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-score-off-brand)", margin: 0 }}>
            {genError}
          </p>
        )}

        {/* Intent selector — brand-active only, sits between prompt and generate */}
        {brandKit && (
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #e0e0e0" }}>
            {IMAGE_MODES.map((mode, i) => (
              <button
                key={mode.value}
                onClick={() => setImageMode(mode.value)}
                title={mode.description}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  border: "none",
                  borderLeft: i > 0 ? "1px solid #e0e0e0" : "none",
                  background: imageMode === mode.value ? "#7d2ae7" : "transparent",
                  color: imageMode === mode.value ? "#fff" : "#757575",
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
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
            padding: "2px 0",
            textAlign: "center",
            width: "100%",
          }}
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

  // Hover tooltip state — 300ms delay, same pattern as canvas toolbar
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showDelayed() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 300);
  }
  function hide() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
  }

  return (
    <div
      className="canva-card"
      style={{ overflow: "visible", position: "relative" }}
    >
      {/* Score breakdown tooltip — floats above the card */}
      {score && (
        <div
          onMouseEnter={() => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }}
          onMouseLeave={hide}
          style={{
            position: "absolute",
            top: 0,
            left: "calc(100% + 8px)",
            width: 260,
            zIndex: 50,
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: 14,
            boxShadow: "0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.07)",
            opacity: showTooltip ? 1 : 0,
            pointerEvents: showTooltip ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)", margin: 0 }}>
              Brand score
            </p>
            <ScoreBadge score={score} />
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.45 }}>
            {score.explanation}
          </p>
          <DimensionBreakdown score={score} />
        </div>
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

        {/* Badge overlay — top-left, hover triggers tooltip */}
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          {image.noBrandContext ? (
            <span className="score-badge-neutral">No brand</span>
          ) : image.scorePending ? (
            <span className="shimmer-pill">Analyzing…</span>
          ) : score ? (
            <div onMouseEnter={showDelayed} onMouseLeave={hide} style={{ cursor: "default" }}>
              <ScoreBadge score={score} compact />
            </div>
          ) : null}
        </div>
      </div>

      {/* Scoring skeleton bars — brand images while score is in flight */}
      {!image.noBrandContext && image.scorePending && (
        <div style={{ padding: "8px 8px 6px", borderTop: "1px solid #f5f5f5" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer-bar"
              style={{
                height: 4,
                borderRadius: 2,
                marginBottom: i < 2 ? 5 : 0,
                width: `${88 - i * 16}%`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Static explanation row — always visible once scored */}
      {score && !image.scorePending && (
        <div style={{ padding: "6px 8px", borderTop: "1px solid #f5f5f5" }}>
          <span style={{
            display: "block",
            fontSize: 10,
            color: "#757575",
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
        gap: 4,
        padding: "6px 8px 8px",
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
              style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}
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
              style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}
              title={`Re-generate targeting: ${score.failingDimension ?? "overall"}`}
            >
              ✦ Improve {failLabel}
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
  );
}
