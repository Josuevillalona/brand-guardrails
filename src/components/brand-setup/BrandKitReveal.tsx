"use client";

import { BrandKit } from "@/types";

interface BrandKitRevealProps {
  brandKit: BrandKit;
  revealedCount: number;
  revealVisual: number;   // threshold at which visual style section appears
  revealVoice: number;    // threshold at which voice summary appears
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

export function BrandKitReveal({
  brandKit,
  revealedCount,
  revealVisual,
  revealVoice,
  onUpdate,
}: BrandKitRevealProps) {
  const showName   = revealedCount >= 1;
  const showVisual = revealedCount >= revealVisual;
  const showVoice  = revealedCount >= revealVoice;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* ── Company name ── */}
      <RevealItem visible={showName}>
        <div style={{
          padding: "var(--space-4) var(--space-5)",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-medium)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "var(--space-1)",
          }}>
            Company
          </p>
          <p style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-bold)",
            color: "var(--color-text-primary)",
          }}>
            {brandKit.companyName}
          </p>
        </div>
      </RevealItem>

      {/* ── Colors ── */}
      <div style={{
        padding: "var(--space-4) var(--space-5)",
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        opacity: revealedCount >= 2 ? 1 : 0,
        transform: revealedCount >= 2 ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.24s ease, transform 0.24s ease",
      }}>
        <p style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-medium)",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "var(--space-3)",
        }}>
          Brand Colors
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {brandKit.colors.map((color, i) => {
            const visible = revealedCount >= 2 + i;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.95)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-md)",
                  background: color.hex,
                  border: "1px solid rgba(0,0,0,0.1)",
                  flexShrink: 0,
                }} />
                <div>
                  <p style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--color-text-primary)",
                    lineHeight: 1.2,
                  }}>
                    {color.descriptiveName}
                  </p>
                  <p style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {color.hex.toUpperCase()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Visual style ── */}
      <RevealItem visible={showVisual}>
        <div style={{
          padding: "var(--space-4) var(--space-5)",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-medium)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "var(--space-3)",
          }}>
            Visual Style
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

            {/* Render style + mood */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px var(--space-3)",
                background: "var(--canva-purple-100, #f0eaff)",
                color: "var(--canva-purple-500, #7d2ae7)",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
              }}>
                {brandKit.renderStyle}
              </span>
              {brandKit.moodAdjectives.map((mood, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px var(--space-3)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  {mood}
                </span>
              ))}
            </div>

            {/* Technical details grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--space-2)",
            }}>
              {[
                { label: "Lighting", value: `${brandKit.lightingStyle}, ${brandKit.lightingTemperature}` },
                { label: "Shot type", value: brandKit.shotType },
                { label: "Depth of field", value: brandKit.depthOfField },
                { label: "Camera angle", value: brandKit.cameraAngle },
                { label: "Color grade", value: brandKit.colorGrade },
                { label: "Environment", value: brandKit.environmentalContext },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    marginBottom: 2,
                  }}>
                    {label}
                  </p>
                  <p style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--color-text-secondary)",
                  }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </RevealItem>

      {/* ── Voice & guidelines ── */}
      <RevealItem visible={showVoice}>
        <div style={{
          padding: "var(--space-4) var(--space-5)",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-medium)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "var(--space-2)",
          }}>
            Brand Voice
          </p>
          <p style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}>
            {brandKit.voiceSummary}
          </p>

          {brandKit.prohibitedElements.length > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <p style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "var(--space-2)",
              }}>
                Avoid
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {brandKit.prohibitedElements.map((el, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px var(--space-3)",
                      background: "rgba(var(--color-score-off-brand-rgb, 220 38 38) / 0.08)",
                      color: "var(--color-score-off-brand)",
                      border: "1px solid rgba(var(--color-score-off-brand-rgb, 220 38 38) / 0.2)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {el}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </RevealItem>

    </div>
  );
}
