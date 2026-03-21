"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@/store/useStore";
import { GeneratedImage, BrandScore } from "@/types";
import { ImageMode } from "@/lib/image-scorer";
import { ScoreBadge } from "@/components/scoring/ScoreBadge";

interface Props {
  onClose: () => void;
}

let imgSeq = 0;

const IMAGE_MODES: { value: ImageMode; label: string; description: string }[] = [
  { value: "hero",       label: "Hero",       description: "Campaign & key brand imagery — full enforcement" },
  { value: "supporting", label: "Supporting",  description: "Food, lifestyle, objects — aesthetic fit, natural subject colors" },
  { value: "broll",      label: "B-roll",      description: "Texture, detail, abstract — mood & atmosphere only" },
];

export function ImageGeneratorPanel({ onClose }: Props) {
  const { brandKit, addImageElement, canvasElements } = useStore();
  const [prompt, setPrompt] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("supporting");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    onClose();
  }

  const expanded = images.find((img) => img.id === expandedId);

  return (
    <div className="canva-modal-backdrop" onClick={onClose}>
      <div
        className="canva-modal"
        style={{ maxWidth: 820, padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: brandKit ? "none" : "1px solid #ebebeb",
        }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)", margin: 0 }}>
            Generate image
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>×</button>
        </div>

        {/* ── Brand context bar (brand-active only) ── */}
        {brandKit && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
            background: "#f9f9f9",
            borderBottom: "1px solid #ebebeb",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {brandKit.colors.slice(0, 3).map((c, i) => (
                  <div
                    key={i}
                    title={c.descriptiveName}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: c.hex,
                      border: "1px solid rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#3d3d3d" }}>
                {brandKit.companyName}
              </span>
              <span style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 100,
                background: "#f0f2ff",
                border: "1px solid #d4b3fb",
                color: "#6620c4",
                fontWeight: 500,
                textTransform: "capitalize",
              }}>
                {brandKit.renderStyle}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#a0a0a0" }}>Brand context active</span>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          maxHeight: "calc(90vh - 120px)",
        }}>

          {/* Intent mode selector — brand-active only */}
          {brandKit && (
            <div>
              <p style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#a0a0a0",
                marginBottom: 8,
                margin: "0 0 8px",
              }}>
                Image intent
              </p>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                {IMAGE_MODES.map((mode, i) => (
                  <button
                    key={mode.value}
                    onClick={() => setImageMode(mode.value)}
                    title={mode.description}
                    style={{
                      flex: 1,
                      padding: "7px 12px",
                      border: "none",
                      borderLeft: i > 0 ? "1px solid #e0e0e0" : "none",
                      background: imageMode === mode.value ? "#7d2ae7" : "transparent",
                      color: imageMode === mode.value ? "#fff" : "#757575",
                      fontSize: 13,
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
            </div>
          )}

          {/* Prompt input */}
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
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
                rows={2}
                disabled={generating}
                className="canva-input flex-1"
                style={{ resize: "none", lineHeight: 1.5 }}
              />
              <button
                onClick={() => generate(prompt)}
                disabled={generating || !prompt.trim()}
                className="btn-ai"
                style={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {generating ? "Generating…" : "✦ Generate"}
              </button>
            </div>
            {genError && (
              <p style={{ marginTop: 8, fontSize: "var(--text-sm)", color: "var(--color-score-off-brand)" }}>
                {genError}
              </p>
            )}
          </div>


          {/* Generation loading skeleton */}
          {generating && (
            <div className="grid grid-cols-2 gap-3u">
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
                    gap: "var(--space-2)",
                  }}
                >
                  <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                  <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
                  <div className="canva-loading-dot" style={{ animationDelay: `${i * 0.3 + 0.3}s` }} />
                </div>
              ))}
            </div>
          )}

          {/* Image grid */}
          {images.length > 0 && !generating && (
            <div className="grid grid-cols-2 gap-3u">
              {images.slice(0, 6).map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  expanded={expandedId === img.id}
                  onExpand={() => setExpandedId(expandedId === img.id ? null : img.id)}
                  onPlace={() => placeOnCanvas(img)}
                  onGetAlternative={() => generate(img.userPrompt, true, img.score?.failingDimension ?? null)}
                />
              ))}
            </div>
          )}


        </div>
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

const DIM_KEYS = [
  "colorAlignment",
  "renderStyleMatch",
  "moodLighting",
  "compositionFit",
  "overallCohesion",
] as const;

function dimColor(val: number) {
  if (val >= 80) return "var(--color-score-on-brand)";
  if (val >= 50) return "var(--color-score-needs-review)";
  return "var(--color-score-off-brand)";
}

function ImageCard({
  image,
  expanded,
  onExpand,
  onPlace,
  onGetAlternative,
}: {
  image: GeneratedImage;
  expanded: boolean;
  onExpand: () => void;
  onPlace: () => void;
  onGetAlternative: () => void;
}) {
  const score = image.score;
  const prohibited = score && !score.dimensions.noProhibited;
  const isOnBrand  = score?.label === "on-brand";
  const failLabel  = score?.failingDimension ? DIM_LABELS_SHORT[score.failingDimension] : "alignment";

  return (
    <div
      className="canva-card"
      style={{
        outline: expanded ? "2px solid var(--canva-purple-500)" : undefined,
        outlineOffset: 2,
        overflow: "visible",
      }}
    >
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

        {/* Badge overlay — top-left */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          {image.noBrandContext ? (
            <span className="score-badge-neutral">No brand context</span>
          ) : image.scorePending ? (
            <span className="shimmer-pill">Analyzing brand alignment…</span>
          ) : score ? (
            <button
              onClick={onExpand}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <ScoreBadge score={score} compact />
            </button>
          ) : null}
        </div>
      </div>

      {/* Scoring skeleton bars — brand images while score is in flight */}
      {!image.noBrandContext && image.scorePending && (
        <div style={{ padding: "10px 12px 8px", borderTop: "1px solid #f5f5f5" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer-bar"
              style={{
                height: 5,
                borderRadius: 3,
                marginBottom: i < 2 ? 6 : 0,
                width: `${88 - i * 16}%`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Collapsed score row — explanation snippet + expand chevron */}
      {score && !image.scorePending && !expanded && (
        <button
          onClick={onExpand}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "8px 12px",
            background: "none",
            border: "none",
            borderTop: "1px solid #f5f5f5",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{
            flex: 1,
            fontSize: 11,
            color: "#757575",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {score.explanation}
          </span>
          <span style={{ fontSize: 10, color: "#a0a0a0", flexShrink: 0 }}>▸</span>
        </button>
      )}

      {/* Expanded dimension breakdown — within card */}
      {score && !image.scorePending && expanded && (
        <div style={{ padding: "12px 12px 6px", borderTop: "1px solid #f5f5f5" }}>
          <p style={{ fontSize: 11, color: "#757575", lineHeight: 1.45, marginBottom: 10 }}>
            {score.explanation}
          </p>

          {DIM_KEYS.map((key) => {
            const val = score.dimensions[key];
            const isFailing = key === score.failingDimension;
            const color = dimColor(val);
            return (
              <div key={key} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10,
                    color: isFailing ? "var(--color-score-off-brand)" : "#757575",
                    fontWeight: isFailing ? 600 : 400,
                  }}>
                    {DIM_LABELS_SHORT[key]}{isFailing ? " ← primary drift" : ""}
                  </span>
                  <span style={{ fontSize: 10, color, fontWeight: 600 }}>{val}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "#f0f0f0" }}>
                  <div style={{ height: "100%", width: `${val}%`, borderRadius: 2, background: color }} />
                </div>
              </div>
            );
          })}

          <button
            onClick={onExpand}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              fontSize: 10,
              color: "#a0a0a0",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0 2px",
            }}
          >
            ▴ Hide breakdown
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "var(--space-3)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}>
        {isOnBrand ? (
          <button onClick={onPlace} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            Use this image
          </button>
        ) : prohibited ? (
          <>
            <button
              onClick={onGetAlternative}
              className="btn-ai"
              style={{ flex: 1, justifyContent: "center" }}
              title="Re-generate avoiding prohibited elements"
            >
              ✦ Regenerate
            </button>
            <button
              onClick={onPlace}
              style={{
                flex: 1,
                justifyContent: "center",
                padding: "0 12px",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "none",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
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
              style={{ flex: 1, justifyContent: "center" }}
              title={`Re-generate targeting: ${score.failingDimension ?? "overall"}`}
            >
              ✦ Improve {failLabel}
            </button>
            <button
              onClick={onPlace}
              style={{
                flex: 1,
                justifyContent: "center",
                padding: "0 12px",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "none",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Use anyway
            </button>
          </>
        ) : (
          <button onClick={onPlace} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            Use this image
          </button>
        )}
      </div>
    </div>
  );
}
