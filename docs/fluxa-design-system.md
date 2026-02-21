# Fluxa Live Design System

## Brand Summary

- Product: Fluxa Live
- Positioning: Financial data engine for live FX motion and purchasing-power comparison.
- Primary tagline: "Money is not static. It moves."
- Alternate micro-lines:
  - "Currency in motion."
  - "Watch value flow."
- Tone: Intelligent, minimal, precise, calm and powerful.

## Logo Deliverables

- Static SVG: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/public/brand/fluxa-logo.svg`
- Animated SVG: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/public/brand/fluxa-logo-animated.svg`
- React component: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/brand/fluxa-logo.tsx`

## Color Tokens

- `--fx-bg`: `#0B0F1A`
- `--fx-surface`: `#111827`
- `--fx-cyan`: `#00E5FF`
- `--fx-positive`: `#22FF88`
- `--fx-negative`: `#FF4D4D`
- `--fx-neutral`: `#9CA3AF`
- `--fx-text`: `#F4F7FF`
- `--fx-muted`: `#9AA9BF`

Defined in `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/globals.css`.

## Typography System

- Primary sans: Inter (`--font-sans`)
- Data mono: IBM Plex Mono (`--font-mono`)
- H1: clamp 42px to 72px
- H2: clamp 30px to 40px
- Body: 14px to 16px equivalent
- Micro labels: 11px to 12px uppercase with tracking

Configured in `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/layout.tsx` and `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/globals.css`.

## Layout System

- 12-column equivalent container strategy with max width `1440px`
- Full-bleed hero treatment inside framed surface
- 4px-base spacing rhythm applied via compact tokenized spacing classes

## Motion Language

- Primary easing: `cubic-bezier(0.45, 0, 0.2, 1)`
- Slot-counter style number transitions for live ticker
- Arc pulse and particle flow in Three.js shader layer
- Bar and panel transitions use subtle spring-like duration/easing combinations
- Reduced motion mode uses global `prefers-reduced-motion` override

## Hero Animation Spec

- Background globe layer scales down and fades as user scrolls into analytics section.
- Arc hover reveals live tooltip (rate, %, volatility, strength).
- Clicking a country marker opens a sliding detail panel with:
  - country flag
  - live rate
  - 24h proxy movement
  - strength gauge
  - mini sparkline

Implemented in:
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/pages/landing-page.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/globe/money-warp-globe.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/lib/globe/globe-scene.ts`

## Component Library

Global components:
- Top navigation: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/chrome/top-nav.tsx`
- Footer: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/chrome/footer.tsx`
- Loading state: `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/common/loading-globe.tsx`
- Gauges:
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/common/strength-gauge.tsx`
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/common/stress-gauge.tsx`
- Data animation:
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/common/animated-number.tsx`
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/common/sparkline.tsx`

Feature modules:
- Purchasing power cards + sortable table:
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/analytics/purchasing-power-panel.tsx`
- Replay page and timeline scrubber:
  - `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/pages/replay-page.tsx`

## Mobile Adaptation Spec

- Replace 3D globe with 2D heatmap projection below `820px`.
- Provide swipeable horizontal country selection chips.
- Reduce heavy motion and panel movement.
- Maintain readable monospace number blocks and high contrast.

Implemented in:
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/components/globe/mobile-heatmap.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/globals.css`

## Core Routes

- Landing: `/`
- Global Strength Index: `/index`
- Replay: `/replay`
- Methodology: `/method`

Route files:
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/page.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/index/page.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/replay/page.tsx`
- `/Users/ege/Desktop/Codex-Docs/marketsdaddy.lol/src/app/method/page.tsx`
