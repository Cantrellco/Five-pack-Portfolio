import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Lets `next dev` reach the local Cloudflare bindings declared in
// wrangler.jsonc (ASSETS, IMAGES, WORKER_SELF_REFERENCE). No-ops for the
// GitHub Pages export build below.
initOpenNextCloudflareForDev();

// Set only for the one-off static export pushed to GitHub Pages (npm run
// build:pages). The real build/deploy target is server-rendered and is
// untouched by any of the branches below.
const GH_PAGES_BASE = process.env.GITHUB_PAGES === 'true' ? '/Five-pack-Portfolio' : '';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    // One page, ~20KB of CSS. Inlining it removes the only render-blocking
    // request on the critical path, which is worth more than caching a
    // stylesheet that changes whenever the site does.
    //
    // Off for the static export: inlining the RSC flight payload alongside
    // the inlined CSS desyncs WebKit's Flight client from how it's chunked
    // when there's no server to stream it progressively — reproduced as a
    // `t.reason.enqueueModel is not a function` crash on first paint in
    // Safari/WebKit specifically (Chromium and the real SSR build are both
    // unaffected). Confirmed by diffing the same export with this flag off.
    inlineCss: GH_PAGES_BASE === '',
  },

  images: {
    // The portrait is an engraving: a field of halftone dots, which is
    // high-frequency noise and the worst case for any codec. WebP alone put
    // it at 145KB and made it a 3.6s LCP on throttled mobile. AVIF is
    // materially better at exactly this kind of texture, so it is offered
    // first and WebP stays as the fallback.
    formats: ['image/avif', 'image/webp'],

    // 60 rather than the default 75. On an engraving the difference is
    // invisible — the detail is halftone dots below the resolution anything
    // displays them at — and it is 35% of the bytes on the one image in the
    // first screen. Next requires every quality actually used to be declared.
    qualities: [60, 75],

    // next/image optimization needs a server; the static export has none.
    unoptimized: GH_PAGES_BASE !== '',
  },

  ...(GH_PAGES_BASE !== ''
    ? {
        output: 'export',
        basePath: GH_PAGES_BASE,
        assetPrefix: `${GH_PAGES_BASE}/`,
      }
    : {
        // The field buffer and the subset fonts are content-hashed by name,
        // so they can be cached hard. Only meaningful behind a real server —
        // `output: export` has none, so this is skipped for that build.
        async headers() {
          return [
            {
              source: '/fonts/:file*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            {
              source: '/field/:file*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            {
              // For whoever opens the network tab: two facts about how the
              // page is drawn, both checkable against components/field/.
              // Render facts only — the training data behind the field is
              // flagged placeholder, so no header claims meaning for it.
              source: '/',
              headers: [
                { key: 'x-draw-calls-per-frame', value: '1' },
                { key: 'x-3d-libraries', value: '0' },
              ],
            },
          ];
        },
      }),

  env: {
    NEXT_PUBLIC_BASE_PATH: GH_PAGES_BASE,
  },
};

export default nextConfig;
