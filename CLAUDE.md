# Portfolio Site

## Commands
- `npm run dev` — local dev
- `npm run build` — production build (must pass before any commit)
- `npm run lint && npm run typecheck` — run both before committing
- `npm run test:e2e` — Playwright smoke tests
- `npm run lh` — local Lighthouse against the production build
- `npm run data` — rebuild the field from `data/training.json` (runs on `prebuild`)
- `npm run data:static` — regenerate `lib/generated/{og-trend,static-assets}.ts` from
  `app/og-display.ttf` and `public/`, so `node:fs` reads happen at build time only
  (Cloudflare Workers has no filesystem at request time; runs on `prebuild`)
- `npm run preview` — build + serve the Workers bundle locally via wrangler
- `npm run deploy` — build + deploy the Workers bundle (`wrangler login` first)

## Architecture
- Deploy target is Cloudflare Workers via `@opennextjs/cloudflare` (`wrangler.jsonc`,
  `open-next.config.ts`), server-rendered — not Cloudflare Pages, not static export.
  The Workers runtime has no filesystem: any `node:fs` read must happen at build
  time (see `npm run data:static` above), never inside a component or route
  handler that can execute on a request. `npm run build:pages` (static export to
  GitHub Pages) is a separate one-off target, untouched by any of this.
- Next.js App Router, TypeScript strict. Single page, anchor navigation.
- ONE persistent WebGL canvas in `components/field/`, mounted once, fixed behind
  the DOM, driven by `lib/field-state.ts`. Never mount per-section scenes.
- Field geometry is precomputed at build time from `data/training.json` into a
  quantised typed array (`public/field/field-v1.bin`, 6 bytes per point). The
  field is ambient scatter only — it never resolves into a plotted chart. One
  deliberate exception: the Konami code (`components/field/FieldMorphTrigger.tsx`)
  briefly blends the scatter onto a closed-form Lissajous curve
  (`components/field/shaders.ts`), computed from each point's index the same
  way the ambient scatter is — no baked shape data, no third buffer, no
  training data involved. Still true to the rule in spirit: it draws no data.
- No 3D library. `components/field/renderer.ts` talks to WebGL directly: one
  program, two buffers, a loop. three.js + react-three-fiber cost 230KB and
  ~1.4s of script evaluation on mobile, which put Lighthouse at 0.69. Do not
  reintroduce one to add a feature — the field needs `drawArrays`, not a scene
  graph. Declare every attribute in the GLSL; nothing injects `position`.
- `components/field/shaders.ts` is one big template literal. No backticks in
  it, not even inside GLSL comments.
- Design tokens live in `app/tokens.css` as CSS custom properties; `globals.css`
  maps them into Tailwind via `@theme inline`. Never hardcode a hex in a
  component.
- All copy lives in `content/`. Components import it, never inline it.

## Aesthetic rules
- Direction: light editorial — warm, typographic, spacious. Ink on paper.
- Banned: cream #F4F1EA + serif + terracotta #D97757 (AI cliché); Inter/Roboto/
  Open Sans/Lato/Poppins/system fonts; gradients; glassmorphism; skill bars;
  emoji in UI.
- One accent colour (`--signal`). If it stops feeling rare, it is overused.
- Six colour tokens. Adding a seventh means deleting one; tints come from
  `color-mix()`.
- One easing family (`--motion-ease`, mirrored in `lib/ease.ts`). Animate
  transform and opacity only.

## Performance budget (enforced by Lighthouse CI — do not regress)
- Mobile Lighthouse: Perf ≥ 90, A11y 100, Best Practices ≥ 95, SEO 100
- LCP < 2.0s, CLS < 0.05, TBT < 250ms, first-view transfer < 1.5MB
- Currently: 96–98 / 100 / 100 / 100, LCP 1.0s, CLS 0.008, 444KB
- Canvas: DPR capped at 1.75, one draw call, no postprocessing, rAF cancelled
  (not skipped) when the tab is hidden, point density drops when frame times slip
- Fonts are subset AND axis-limited by `scripts/subset-fonts.py`. Re-run it if a
  face or the charset changes; outputs are committed so CI needs no Python.

## Non-negotiable
- Site is fully functional with JS off, WebGL off, reduced motion on, and on a
  two-core device. All four are covered by `e2e/smoke.spec.ts` — keep them green.
- Canvas is `aria-hidden`. All content is real DOM text.
- No scroll-jacking. Lenis smooths the wheel; touch stays native.
- Zero console errors AND zero console warnings. The e2e suite asserts this.
- Never state a fact about the training data that the data does not support —
  `data/training.json`'s `placeholder` flag (surfaced as `fieldStats.placeholder`
  in `lib/generated/field-stats.ts`) marks synthetic data for exactly this
  reason.
