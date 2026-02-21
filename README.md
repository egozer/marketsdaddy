# Fluxa Live

No-login, real-time FX visualization and purchasing-power platform.

Tagline: **Money is not static. It moves.**

## Product Routes

- `/` Landing and live globe/heatmap experience
- `/index` Global Strength Index
- `/replay` Historical replay interface
- `/method` Methodology and formulas

## Tech

- Next.js App Router
- TypeScript (strict)
- Three.js with instanced arc rendering
- Web Worker metrics and interpolation
- Zustand state

## Design Deliverables Included

- Static and animated logo SVGs
- Dark-only tokenized brand system
- Global components (top nav, footer, loading, cards, gauges)
- Motion and mobile adaptation specification (`/docs/fluxa-design-system.md`)

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Note

If npm registry/network is blocked in your environment, install/lint/test/build commands cannot run until connectivity is available.
