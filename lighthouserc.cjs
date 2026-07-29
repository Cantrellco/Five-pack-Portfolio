/**
 * Performance budget. A regression here fails CI.
 *
 * `throttlingMethod: 'devtools'` applies the mobile profile to the browser for
 * real, rather than Lighthouse's default of observing a fast run and modelling
 * a slow one. Same 1.6Mbps / 150ms RTT / 4x CPU target either way.
 *
 * The default simulation reports this page's LCP as ~3.0s while its own
 * observed measurement of the same trace is ~0.29s — Lantern is pessimistic
 * about text elements behind webfonts. Measuring the real thing gives 1.0s,
 * and the 2.0s budget below is asserted against that rather than relaxed to
 * accommodate the model.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx next start -p 4173',
      startServerReadyPattern: 'Ready in',
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: { throttlingMethod: 'devtools' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 250 }],
        'total-byte-weight': ['error', { maxNumericValue: 1572864 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
