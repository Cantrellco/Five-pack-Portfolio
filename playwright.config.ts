import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    // Set PLAYWRIGHT_CHROMIUM_PATH to reuse a Chromium that is already on the
    // machine instead of downloading one. Unset everywhere else, so CI and a
    // normal checkout both just work.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Tests run against a production build. A dev-server smoke test would not
  // catch the things that actually break in production.
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // A throwaway signing secret so the webhook's signature check can be
      // tested in both directions. Proving it REJECTS a forgery is only half
      // the property — a verifier that always returned false would pass that
      // and silently drop every real event — so e2e/pay.spec.ts signs a
      // payload with this same string and asserts the endpoint accepts it.
      //
      // Deliberately not a Stripe key and not a secret: it authenticates
      // nothing, and no STRIPE_SECRET_KEY is set alongside it, so no test can
      // reach the Stripe API.
      STRIPE_WEBHOOK_SECRET: 'whsec_e2e_not_a_real_secret',
    },
  },
});
