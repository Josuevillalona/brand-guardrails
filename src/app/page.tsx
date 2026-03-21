"use client";

import { useStore } from "@/store/useStore";
import { BrandSetupPanel } from "@/components/brand-setup/BrandSetupPanel";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";

export default function Home() {
  const { phase, brandKit, setShowBrandSetup, showBrandSetup } = useStore();

  return (
    <div className="canva-shell">
      {/* Top nav — Canva gradient bar */}
      <nav className="canva-nav">
        {/* Logo mark */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <rect width="22" height="22" rx="5" fill="rgba(255,255,255,0.2)" />
          <path
            d="M11 4L13.5 9.5H19L14.5 13L16.5 18.5L11 15L5.5 18.5L7.5 13L3 9.5H8.5L11 4Z"
            fill="white"
          />
        </svg>

        <span className="canva-nav-logo">AI Brand Guardrails</span>

        <div className="canva-nav-divider" />

        <span className="canva-nav-label">Canva Teams concept</span>

        <div className="canva-nav-spacer" />

        {/* Brand Kit indicator */}
        {brandKit && (
          <div className="flex items-center gap-2 mr-2">
            <div className="flex gap-1">
              {brandKit.colors.slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <span className="canva-nav-label truncate max-w-[120px]">
              {brandKit.companyName}
            </span>
          </div>
        )}

        {phase === "canvas" && (
          <button
            onClick={() => setShowBrandSetup(true)}
            className="canva-nav-btn"
          >
            {brandKit ? "Switch brand" : "Add brand kit"}
          </button>
        )}
      </nav>

      {/* Editor area */}
      <div className="canva-editor" style={{ position: "relative" }}>
        {phase === "brand-setup" ? (
          <BrandSetupPanel />
        ) : (
          <CanvasWorkspace />
        )}

        {/* Brand Kit setup modal — rendered over canvas for mid-session setup */}
        {phase === "canvas" && showBrandSetup && (
          <div
            className="canva-modal-backdrop"
            onClick={() => setShowBrandSetup(false)}
          >
            <div
              className="canva-modal"
              style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <BrandSetupPanel
                isModal
                onDismiss={() => setShowBrandSetup(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
