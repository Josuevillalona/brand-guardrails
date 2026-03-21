import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Canva brand colors ──────────────────────────────────
      colors: {
        canva: {
          purple: {
            50:  '#f5f0ff',
            100: '#ede0fd',
            200: '#d4b3fb',
            300: '#b57ef6',
            400: '#9a50f0',
            500: '#7d2ae7', // brand purple — verified
            600: '#6620c4',
            700: '#4f189a',
            800: '#381072',
          },
          blue:  { 500: '#3969e7', 400: '#5e8af0' },
          teal:  { 500: '#07b9ce', 400: '#33cee0', 600: '#059db0' },
          neutral: {
            0:   '#ffffff',
            50:  '#fafafa',
            100: '#f5f5f5',
            150: '#f0f2f5',
            200: '#e8e8e8',
            300: '#d0d0d0',
            400: '#a8a8a8',
            500: '#757575',
            600: '#555555',
            700: '#3d3d3d',
            800: '#2d2d2d',
            900: '#1a1a1a',
          },
        },
        // Score / compliance
        score: {
          'on-brand':     '#16a34a',
          'needs-review': '#d97706',
          'off-brand':    '#dc2626',
          'on-bg':        '#f0fdf4',
          'needs-bg':     '#fffbeb',
          'off-bg':       '#fef2f2',
          'on-border':    '#bbf7d0',
          'needs-border': '#fde68a',
          'off-border':   '#fecaca',
        },
      },

      // ── Font family ─────────────────────────────────────────
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
      },

      // ── Font sizes — Canva uses 13px as base ────────────────
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['12px', { lineHeight: '1.4' }],
        'base': ['13px', { lineHeight: '1.5' }],
        'md':   ['14px', { lineHeight: '1.5' }],
        'lg':   ['16px', { lineHeight: '1.5' }],
        'xl':   ['18px', { lineHeight: '1.4' }],
        '2xl':  ['22px', { lineHeight: '1.3' }],
        '3xl':  ['28px', { lineHeight: '1.2' }],
      },

      // ── Spacing — 8px unit system ────────────────────────────
      spacing: {
        '0.5u': '4px',
        '1u':   '8px',
        '1.5u': '12px',
        '2u':   '16px',
        '2.5u': '20px',
        '3u':   '24px',
        '4u':   '32px',
        '5u':   '40px',
        '6u':   '48px',
        '8u':   '64px',
      },

      // ── Border radius ────────────────────────────────────────
      borderRadius: {
        'sm':   '4px',
        'md':   '8px',
        'lg':   '12px',
        'xl':   '16px',
        'pill': '9999px',
      },

      // ── Layout ───────────────────────────────────────────────
      height: {
        'nav': '48px',
      },
      width: {
        'icon-strip': '56px',
        'panel':      '240px',
        'props':      '240px',
      },

      // ── Shadows ──────────────────────────────────────────────
      boxShadow: {
        'canva-sm':    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'canva-md':    '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'canva-lg':    '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        'canva-modal': '0 20px 60px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.1)',
        'canvas':      '0 2px 8px rgba(0,0,0,0.15)',
      },

      // ── Transitions ──────────────────────────────────────────
      transitionDuration: {
        'fast':   '100ms',
        'normal': '160ms',
        'slow':   '240ms',
      },

      // ── Background gradients ─────────────────────────────────
      backgroundImage: {
        'canva-nav': 'linear-gradient(90deg, #07b9ce 0%, #7d2ae7 100%)',
      },
    },
  },
  plugins: [],
}

export default config
