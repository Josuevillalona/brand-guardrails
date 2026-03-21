"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { BrandKitPreview } from "./BrandKitPreview";

export function BrandSetupPanel() {
  const [url, setUrl] = useState("");
  const { brandKit, brandExtracting, brandError, setBrandKit, setBrandExtracting, setBrandError, setPhase } =
    useStore();

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBrandExtracting(true);
    setBrandError(null);
    try {
      const res = await fetch("/api/extract-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setBrandKit(data.brandKit);
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBrandExtracting(false);
    }
  }

  return (
    /* Full-height centered layout — sits inside canva-editor */
    <div
      className="canva-canvas-area"
      style={{ alignItems: "flex-start", overflowY: "auto" }}
    >
      <div className="w-full max-w-2xl py-8u">

        {/* Header */}
        <div className="mb-6u text-center">
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
            Set up your Brand Kit
          </h1>
          <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-secondary)" }}>
            Enter your website URL. We&apos;ll extract your brand colors, style, mood, and guidelines automatically.
          </p>
        </div>

        {/* URL input row */}
        <form onSubmit={handleExtract} style={{ marginBottom: "var(--space-6)" }}>
          <div className="flex gap-2u">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              required
              className="canva-input flex-1"
            />
            <button
              type="submit"
              disabled={brandExtracting || !url.trim()}
              className="btn-primary"
            >
              {brandExtracting ? "Extracting…" : "Extract Brand Kit"}
            </button>
          </div>
          {brandError && (
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-score-off-brand)" }}>
              {brandError}
            </p>
          )}
        </form>

        {/* Loading */}
        {brandExtracting && (
          <div className="flex flex-col items-center gap-3u py-8u">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="canva-loading-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              Scraping site and extracting brand signals…
            </p>
          </div>
        )}

        {/* Brand Kit preview */}
        {brandKit && !brandExtracting && (
          <>
            <BrandKitPreview
              brandKit={brandKit}
              onUpdate={(partial) => useStore.getState().updateBrandKit(partial)}
            />
            <div className="flex justify-end mt-4u">
              <button onClick={() => setPhase("canvas")} className="btn-primary">
                Confirm and open canvas →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
