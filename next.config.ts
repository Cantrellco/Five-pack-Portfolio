import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // This app lives in a subdirectory of a repo that has its own lockfile at the
  // root; pin the workspace root so Turbopack does not infer the parent.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },

  experimental: {
    // One page, ~20KB of CSS. Inlining it removes the only render-blocking
    // request on the critical path, which is worth more than caching a
    // stylesheet that changes whenever the site does.
    inlineCss: true,
  },

  // The field buffer and the subset fonts are content-hashed by name, so they
  // can be cached hard. Everything else keeps Next's defaults.
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
    ];
  },
};

export default nextConfig;
