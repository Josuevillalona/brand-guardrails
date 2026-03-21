"use client";

import { BrandKit } from "@/types";
import { ColorSwatch } from "./ColorSwatch";

interface Props {
  brandKit: BrandKit;
  onUpdate: (partial: Partial<BrandKit>) => void;
}

const RENDER_STYLE_LABELS: Record<string, string> = {
  photorealistic: "Photorealistic",
  editorial: "Editorial",
  "flat-vector": "Flat / Vector",
  "3d-cgi": "3D CGI",
  illustrated: "Illustrated",
};

export function BrandKitPreview({ brandKit, onUpdate }: Props) {
  return (
    <div className="canva-card" style={{ padding: "var(--space-5)" }}>

      {/* Company + URL */}
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-5)" }}>
        <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-text-primary)" }}>
          {brandKit.companyName}
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          {brandKit.url}
        </span>
      </div>

      {/* Color palette */}
      <Section label="Color palette">
        <div className="flex flex-wrap gap-2u">
          {brandKit.colors.map((color, i) => (
            <ColorSwatch
              key={i}
              color={color}
              onUpdateName={(name) => {
                const updated = [...brandKit.colors];
                updated[i] = { ...updated[i], descriptiveName: name };
                onUpdate({ colors: updated });
              }}
            />
          ))}
        </div>
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          Temperature: <strong>{brandKit.colorTemperature}</strong> · Saturation:{" "}
          <strong>{brandKit.colorSaturation}</strong>
        </p>
      </Section>

      {/* Render style */}
      <Section label="Render style">
        <span
          className="canva-pill"
          style={{
            background: "var(--canva-purple-50)",
            borderColor: "var(--canva-purple-200)",
            color: "var(--canva-purple-600)",
            fontWeight: "var(--weight-bold)",
          }}
        >
          {RENDER_STYLE_LABELS[brandKit.renderStyle] ?? brandKit.renderStyle}
        </span>
      </Section>

      {/* Mood adjectives */}
      <Section label="Brand mood">
        <div className="flex flex-wrap gap-1.5">
          {brandKit.moodAdjectives.map((adj, i) => (
            <span key={i} className="canva-pill">{adj}</span>
          ))}
        </div>
      </Section>

      {/* Lighting + Shot type — 2 col */}
      <Section label="">
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Lighting</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.lightingStyle}</p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>{brandKit.lightingTemperature}</p>
          </div>
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Shot type</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)", textTransform: "capitalize" }}>{brandKit.shotType}</p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>{brandKit.negativeSpace} negative space</p>
          </div>
        </div>
      </Section>

      {/* Extended fields — 2 col grid */}
      <Section label="">
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Depth of field</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.depthOfField}</p>
          </div>
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Camera angle</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.cameraAngle}</p>
          </div>
        </div>
      </Section>

      <Section label="">
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Color grade</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.colorGrade}</p>
          </div>
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Aspect ratio</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.aspectRatioConvention}</p>
          </div>
        </div>
      </Section>

      <Section label="">
        <div className="grid grid-cols-2 gap-4u">
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Environment</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.environmentalContext}</p>
          </div>
          <div>
            <p className="canva-panel-label" style={{ marginBottom: "var(--space-1)" }}>Typography</p>
            <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>{brandKit.typographyPersonality}</p>
          </div>
        </div>
      </Section>

      {/* Voice */}
      <Section label="Brand voice">
        <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          {brandKit.voiceSummary}
        </p>
      </Section>

      {/* Prohibited elements */}
      <Section label="Prohibited in AI images" last>
        <div className="flex flex-wrap gap-1.5">
          {brandKit.prohibitedElements.map((el, i) => (
            <span
              key={i}
              className="canva-pill"
              style={{
                background: "var(--color-score-off-bg)",
                borderColor: "var(--color-score-off-border)",
                color: "var(--color-score-off-brand)",
              }}
            >
              {el}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : "var(--space-5)" }}>
      {label && <p className="canva-panel-label">{label}</p>}
      {children}
    </div>
  );
}
