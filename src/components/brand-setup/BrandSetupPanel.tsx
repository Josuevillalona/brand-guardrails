"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { BrandKitReveal } from "./BrandKitReveal";

// Loading status lines — progress on a timer during extraction
const LOADING_STEPS = [
  "Fetching website…",
  "Capturing screenshot…",
  "Extracting brand signals…",
];

// Approximate timing for each step (ms from extraction start)
const STEP_DELAYS = [0, 2500, 5500];

interface BrandSetupPanelProps {
  isModal?: boolean;
  onDismiss?: () => void;
}

export function BrandSetupPanel({ isModal = false, onDismiss }: BrandSetupPanelProps) {
  const [url, setUrl] = useState("");
  const [loadingStep, setLoadingStep] = useState(0); // 1-3 active, +0.5 = complete
  const [revealedCount, setRevealedCount] = useState(0);

  const {
    brandKit, brandExtracting, brandError,
    setBrandKit, setBrandExtracting, setBrandError, setPhase,
  } = useStore();

  // Advance loading status lines while extracting
  useEffect(() => {
    if (!brandExtracting) return;
    setLoadingStep(1);
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setLoadingStep(i + 2), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [brandExtracting]);

  // Trigger staggered reveal after brandKit arrives
  useEffect(() => {
    if (!brandKit) return;
    setRevealedCount(0);
    // How many reveal units: 1 (name) + N colors + 3 (visual style, voice, confirm)
    const totalSteps = 1 + brandKit.colors.length + 3;
    const timers = Array.from({ length: totalSteps }, (_, i) =>
      setTimeout(() => setRevealedCount(i + 1), (i + 1) * 150)
    );
    return () => timers.forEach(clearTimeout);
  }, [brandKit]);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    const raw = url.trim();
    if (!raw) return;
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setBrandExtracting(true);
    setBrandError(null);
    setRevealedCount(0);
    try {
      const res = await fetch("/api/extract-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
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

  function handleReExtract() {
    useStore.getState().clearBrandKit();
    setRevealedCount(0);
    setLoadingStep(0);
  }

  const colorCount = brandKit?.colors.length ?? 0;
  // Reveal thresholds
  const REVEAL_VISUAL  = 1 + colorCount + 1; // after company + all colors
  const REVEAL_VOICE   = REVEAL_VISUAL + 1;
  const REVEAL_CONFIRM = REVEAL_VOICE + 1;

  const inner = (
    <>

        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1 style={{
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-bold)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}>
            Set up your Brand Kit
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-normal)" }}>
            Enter your website URL. We&apos;ll extract your brand colors, style, mood, and guidelines automatically.
          </p>
          {/* Skip link — only on initial full-page flow */}
          {!isModal && (
            <button
              onClick={() => setPhase("canvas")}
              style={{
                marginTop: "var(--space-3)",
                background: "none",
                border: "none",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Skip for now, start designing →
            </button>
          )}
        </div>

        {/* URL input */}
        <form onSubmit={handleExtract} style={{ marginBottom: "var(--space-6)" }}>
          <div className="flex gap-2u">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              required
              disabled={brandExtracting}
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
            <div style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-score-off-bg)",
              border: "1px solid var(--color-score-off-border)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              gap: "var(--space-3)",
              alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⊘</span>
              <div>
                <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-score-off-brand)" }}>
                  Extraction failed
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-score-off-brand)", lineHeight: "var(--leading-normal)", opacity: 0.85 }}>
                  {brandError}
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Loading status lines */}
        {brandExtracting && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            padding: "var(--space-5)",
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "var(--space-5)",
          }}>
            {LOADING_STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isComplete = loadingStep > stepNum;
              const isActive = loadingStep === stepNum;
              const isPending = loadingStep < stepNum;

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    opacity: isPending ? 0 : 1,
                    transform: isPending ? "translateY(4px)" : "translateY(0)",
                    transition: "opacity 0.2s ease, transform 0.2s ease",
                  }}
                >
                  {/* Status icon */}
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isComplete
                      ? "var(--color-score-on-brand)"
                      : isActive
                      ? "var(--canva-purple-100)"
                      : "var(--canva-gray-100)",
                    border: isActive ? "2px solid var(--canva-purple-500)" : "none",
                    transition: "background 0.2s ease",
                  }}>
                    {isComplete ? (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div className="canva-loading-dot" style={{ width: 6, height: 6 }} />
                    ) : null}
                  </div>

                  <span style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive ? "var(--weight-medium)" : "var(--weight-regular)",
                    color: isComplete
                      ? "var(--color-text-muted)"
                      : isActive
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                    transition: "color 0.2s ease",
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Animated Brand Kit reveal */}
        {brandKit && !brandExtracting && (
          <BrandKitReveal
            brandKit={brandKit}
            revealedCount={revealedCount}
            revealVisual={REVEAL_VISUAL}
            revealVoice={REVEAL_VOICE}
            onUpdate={(partial) => useStore.getState().updateBrandKit(partial)}
          />
        )}

        {/* Confirm + re-extract actions */}
        {brandKit && !brandExtracting && revealedCount >= REVEAL_CONFIRM && (
          <Revealed>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "var(--space-2)",
              marginTop: "var(--space-4)",
            }}>
              <button onClick={() => { setPhase("canvas"); onDismiss?.(); }} className="btn-primary">
                Use this brand kit →
              </button>
              <button
                onClick={handleReExtract}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Re-extract
              </button>
            </div>
          </Revealed>
        )}
    </>
  );

  if (isModal) {
    return (
      <div style={{ padding: "var(--space-8) var(--space-6) var(--space-6)" }}>
        {inner}
      </div>
    );
  }

  return (
    <div className="canva-canvas-area" style={{ alignItems: "flex-start", overflowY: "auto" }}>
      <div className="w-full max-w-2xl" style={{ padding: "var(--space-8) 0" }}>
        {inner}
      </div>
    </div>
  );
}

// Wrapper that's always visible (used for confirm section which self-manages timing via parent)
function Revealed({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      opacity: 1,
      transform: "translateY(0)",
      transition: "opacity 0.24s ease, transform 0.24s ease",
    }}>
      {children}
    </div>
  );
}
