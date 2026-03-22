"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { BrandSetupPanel } from "@/components/brand-setup/BrandSetupPanel";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import type { AppPhase } from "@/types";

const CAROUSEL_IMGS = Array.from({ length: 11 }, (_, i) => `/carousel/${i + 1}.png`);

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flex: 1,
      width: "100%",
      background: "#fff",
      textAlign: "center",
      overflow: "hidden",
      minHeight: 0,
    }}>
      {/* Hero text block */}
      <div style={{
        padding: "120px var(--space-6) 36px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: "clamp(36px, 4.5vw, 58px)",
          fontWeight: 800,
          color: "#1a1a2e",
          lineHeight: 1.12,
          letterSpacing: "-0.025em",
          marginBottom: 16,
          whiteSpace: "nowrap",
        }}>
          What will you{" "}
          <span style={{ color: "var(--canva-purple-500)" }}>create</span>
          {" "}today?
        </h1>

        <p style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          maxWidth: 520,
          marginBottom: 28,
        }}>
          Generate brand-aligned AI images that match your visual identity.
        </p>

        <button
          onClick={onStart}
          className="btn-primary"
          style={{
            fontSize: "var(--text-base)",
            padding: "13px 36px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          Start designing
        </button>
      </div>

      {/* Infinite scroll carousel */}
      <div style={{
        width: "100%",
        overflow: "hidden",
        marginTop: 56,
        maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
      }}>
        <style>{`
          @keyframes carousel-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .carousel-track { animation: none !important; }
          }
        `}</style>
        <div
          className="carousel-track"
          style={{
            display: "flex",
            gap: 16,
            width: "max-content",
            animation: "carousel-scroll 55s linear infinite",
            alignItems: "flex-start",
          }}
        >
          {[...CAROUSEL_IMGS, ...CAROUSEL_IMGS].map((src, i) => (
            <div
              key={i}
              style={{
                width: 240,
                height: 380,
                borderRadius: 14,
                overflow: "hidden",
                flexShrink: 0,
                border: "1px solid var(--color-border-default)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              <img
                src={src}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { phase, brandKit, setShowBrandSetup, showBrandSetup } = useStore();

  // Phase transition: fade out → swap → fade in
  const [displayedPhase, setDisplayedPhase] = useState<AppPhase>(phase);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phase === displayedPhase) return;
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayedPhase(phase);
      setVisible(true);
    }, 220);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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
        <div style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          height: "100%",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}>
          {displayedPhase === "home" ? (
            <HomeScreen onStart={() => useStore.getState().setPhase("canvas")} />
          ) : displayedPhase === "brand-setup" ? (
            <BrandSetupPanel />
          ) : (
            <CanvasWorkspace />
          )}
        </div>

        {/* Brand Kit setup modal — rendered over canvas for mid-session setup */}
        {phase === "canvas" && showBrandSetup && (
          <div
            className="canva-modal-backdrop"
            onClick={() => setShowBrandSetup(false)}
          >
            <div
              className="canva-modal"
              style={{ maxWidth: 600 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Floating X — always visible, outside scroll area */}
              <button
                onClick={() => setShowBrandSetup(false)}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--canva-gray-100)",
                  border: "1px solid var(--color-border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--canva-gray-200)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--canva-gray-100)")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="var(--color-text-secondary)" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Scrollable content */}
              <div style={{ overflowY: "auto", maxHeight: "90vh" }}>
                <BrandSetupPanel
                  isModal
                  onDismiss={() => setShowBrandSetup(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
