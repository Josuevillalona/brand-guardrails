"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@/store/useStore";
import { GeneratedImage, BrandScore } from "@/types";
import { ImageMode } from "@/lib/image-scorer";
import { ScoreBadge, NoBrandBadge } from "@/components/scoring/ScoreBadge";
import { DimensionBreakdown } from "@/components/scoring/DimensionBreakdown";

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
      // Generate 2 images — same FLUX model regardless of Brand Kit state.
      // Brand context is the only variable; model quality must be constant for a valid comparison.
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
        scorePending: hasBrand,   // no scoring without Brand Kit
        noBrandContext: !hasBrand,
      }));

      setImages((prev) => [...newImages, ...prev]);

      // Score in parallel — only when Brand Kit is active
      if (hasBrand) {
        newImages.forEach((img) => {
          scoreImage(img.id, img.imageUrl, userPrompt, imageMode);
        });
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
        prev.map((img) =>
          img.id === id ? { ...img, score, scorePending: false } : img
        )
      );
    } catch {
      // Score failed — clear pending silently
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, scorePending: false } : img
        )
      );
    }
  }

  function placeOnCanvas(img: GeneratedImage) {
    // Place at a slightly offset position from any existing images
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
      <div className="canva-modal" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="canva-modal-header">
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
              Generate image
            </h2>
            {brandKit ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: 2 }}>
                Brand Kit: <strong>{brandKit.companyName}</strong> · Brand context injected automatically
              </p>
            ) : (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: 2 }}>
                No brand kit active · Images generate without brand constraints
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>×</button>
        </div>

        <div className="canva-modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Image mode selector — only meaningful with an active Brand Kit */}
          {brandKit && (
            <div>
              <p className="canva-panel-label" style={{ marginBottom: "var(--space-2)" }}>Image type</p>
              <div className="flex gap-2u">
                {IMAGE_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setImageMode(mode.value)}
                    title={mode.description}
                    style={{
                      flex: 1,
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      border: imageMode === mode.value
                        ? "2px solid var(--canva-purple-500)"
                        : "1px solid var(--color-border-default)",
                      background: imageMode === mode.value
                        ? "var(--canva-purple-50)"
                        : "var(--color-bg-surface)",
                      color: imageMode === mode.value
                        ? "var(--canva-purple-600)"
                        : "var(--color-text-secondary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      fontWeight: imageMode === mode.value ? "var(--weight-bold)" : "var(--weight-medium)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                {IMAGE_MODES.find((m) => m.value === imageMode)?.description}
              </p>
            </div>
          )}

          {/* Prompt input */}
          <div>
            <div className="flex gap-2u">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generate(prompt); }}
                placeholder={brandKit ? "Describe the image you need…" : "Describe the image you want…"}
                className="canva-input flex-1"
                disabled={generating}
              />
              <button
                onClick={() => generate(prompt)}
                disabled={generating || !prompt.trim()}
                className="btn-ai"
              >
                {generating ? "Generating…" : "✦ Generate"}
              </button>
            </div>
            {genError && (
              <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-score-off-brand)" }}>
                {genError}
              </p>
            )}
          </div>

          {/* Generating skeleton */}
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
                  onGetAlternative={() => {
                    const failing = img.score?.failingDimension ?? null;
                    generate(img.userPrompt, true, failing);
                  }}
                />
              ))}
            </div>
          )}

          {/* Expanded score detail — only for brand-scored images */}
          {expanded?.score && !expanded.noBrandContext && (
            <div
              style={{
                background: "var(--canva-gray-50)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                <div>
                  <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
                    Brand score breakdown
                  </p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Evaluated as: <strong style={{ textTransform: "capitalize" }}>{imageMode}</strong> image
                  </p>
                </div>
                <ScoreBadge score={expanded.score} />
              </div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
                {expanded.score.explanation}
              </p>
              <DimensionBreakdown score={expanded.score} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
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
      <div style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", overflow: "hidden" }}>
        <Image
          src={image.imageUrl}
          alt={image.userPrompt}
          fill
          style={{ objectFit: "cover" }}
          unoptimized
        />

        {/* Score badge overlay */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          {image.noBrandContext ? (
            <NoBrandBadge />
          ) : image.scorePending ? (
            <span
              className="score-pending"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px var(--space-2)",
                borderRadius: "var(--radius-sm)",
                background: "rgba(0,0,0,0.55)",
                fontSize: "var(--text-xs)",
                color: "white",
                backdropFilter: "blur(4px)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              Scoring…
            </span>
          ) : image.score ? (
            <button onClick={onExpand} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <ScoreBadge score={image.score} compact />
            </button>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          padding: "var(--space-3)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <button onClick={onPlace} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
          Use this
        </button>
        {image.score && image.score.label !== "on-brand" && (
          <button
            onClick={onGetAlternative}
            className="btn-ai"
            style={{ flex: 1, justifyContent: "center" }}
            title={`Re-generate targeting: ${image.score.failingDimension ?? "overall"}`}
          >
            ✦ Get on-brand version
          </button>
        )}
      </div>
    </div>
  );
}
