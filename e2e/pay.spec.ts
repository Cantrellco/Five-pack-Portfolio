import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { watchConsole } from './console';

/**
 * The payment route.
 *
 * These run with no Stripe key, which is the point rather than a limitation.
 * Every amount the server should REJECT is rejected before Stripe is ever
 * contacted, so those assertions are exact and hold identically in CI, on a
 * fresh clone, and on a machine that does have a key in its environment. The
 * cases with a valid amount assert only that it was NOT rejected — the two
 * legitimate outcomes there depend on whether a key is present, and a test
 * that quietly assumed one would fail for the next person to clone this.
 *
 * The rule most of these defend is the one in CLAUDE.md: the site works with
 * JavaScript off. A payment flow is where that stops being a principle and
 * becomes someone unable to pay an invoice.
 */

/** Both destinations that mean "the amount was accepted and handed on":
 *  Stripe's own checkout when a key is configured, or back to /pay with
 *  `config` when one is not. Neither is `error=amount`, which is the thing
 *  actually being asserted. */
const HANDED_ON = /checkout\.stripe\.com|error=config/;

test.describe('the payment page', () => {
  test('renders both forms and says nothing to the console', async ({ page }) => {
    const problems = watchConsole(page);

    const response = await page.goto('/pay');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pay an invoice');
    await expect(page.getByRole('heading', { name: 'One-time payment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Monthly retainer' })).toBeVisible();

    // Every control reachable by its label. This is the a11y-100 requirement
    // in practice: `getByLabel` resolves through the accessible name, so a
    // detached label fails here rather than in an audit.
    await expect(page.getByLabel(/^Amount\s+USD/)).toBeVisible();
    await expect(page.getByLabel(/^Amount per month\s+USD/)).toBeVisible();
    await expect(page.getByLabel(/Invoice reference/)).toBeVisible();

    await expect(page.getByRole('button', { name: 'Continue to payment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set up monthly payment' })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('keeps itself out of the search index', async ({ page }) => {
    await page.goto('/pay');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('the whole page is reachable on a short desktop viewport', async ({ page }) => {
    // The deck locks `.page` to 100svh with `overflow: hidden` at lg and up.
    // A standalone document inheriting that lock gets guillotined with no
    // scrollbar to reach the rest — which is exactly what happened here, and
    // it took the foot note and the way back with it. `.page-flow` opts out.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/pay');

    const back = page.getByRole('link', { name: 'Back to the front page' });
    await back.scrollIntoViewIfNeeded();
    await expect(back).toBeInViewport();

    // Same check for the last of the two forms' controls, since a clip that
    // spared the link could still eat a submit button.
    await expect(page.getByRole('button', { name: 'Set up monthly payment' })).toBeVisible();
  });

  test('does not overflow sideways from 320px up', async ({ page }) => {
    await page.goto('/pay');

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `overflows at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
});

/**
 * The flow as a browser without scripting performs it: fill a field, press a
 * button, follow a redirect. If any of this breaks, something has started
 * depending on client JavaScript that must not.
 */
test.describe('the payment form with scripting off', () => {
  test.use({ javaScriptEnabled: false });

  test('both forms are real forms that post to the server', async ({ page }) => {
    await page.goto('/pay');

    const forms = page.locator('form[action="/api/checkout"]');
    await expect(forms).toHaveCount(2);

    const methods = await forms.evaluateAll((els) =>
      els.map((e) => (e as HTMLFormElement).method.toLowerCase()),
    );
    expect(methods).toEqual(['post', 'post']);
  });

  test('a valid amount is accepted and handed on, not bounced back', async ({ page }) => {
    await page.goto('/pay');
    const from = page.url();

    await page.getByLabel(/^Amount\s+USD/).fill('1500');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL((url) => url.href !== from, { timeout: 20_000 });

    const url = page.url();
    expect(url, `1500 was rejected as an invalid amount: ${url}`).not.toContain('error=amount');
    expect(url).toMatch(HANDED_ON);
  });

  test('the monthly form reaches the server too', async ({ page }) => {
    await page.goto('/pay');
    const from = page.url();

    await page.getByLabel(/^Amount per month\s+USD/).fill('400');
    await page.getByRole('button', { name: 'Set up monthly payment' }).click();
    await page.waitForURL((url) => url.href !== from, { timeout: 20_000 });

    expect(page.url()).not.toContain('error=amount');
    expect(page.url()).toMatch(HANDED_ON);
  });

  test('an amount below the floor comes back with a reason, having charged nothing', async ({
    page,
  }) => {
    await page.goto('/pay');
    const from = page.url();

    // 4.99 is deliberate: it satisfies the input's `pattern`, so the browser
    // submits it and the SERVER is what rejects it. A value like "abc" would
    // never leave the page — native constraint validation would stop it —
    // which is correct behaviour but tests nothing about the server.
    await page.getByLabel(/^Amount\s+USD/).fill('4.99');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL((url) => url.href !== from, { timeout: 20_000 });

    expect(page.url()).toContain('error=amount');

    // The reason is on the page, not only in the URL — and it is the fixed
    // copy from content/pay.ts. The reader's own input is never echoed back.
    await expect(page.getByRole('alert')).toContainText('Enter an amount between');
    await expect(page.getByLabel(/^Amount\s+USD/)).toHaveAttribute('aria-invalid', 'true');

    // And ONLY that field. The retainer form was never submitted, so marking
    // its amount invalid would be telling someone a number they never entered
    // is wrong.
    await expect(page.getByLabel(/^Amount per month\s+USD/)).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('the input stops an obvious typo before it costs a round trip', async ({ page }) => {
    await page.goto('/pay');
    const from = page.url();

    await page.getByLabel(/^Amount\s+USD/).fill('fifteen hundred');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForTimeout(500);

    // Native constraint validation, working with scripting off. The server
    // would reject this too — see the matrix below, which posts straight past
    // this check — but there is no reason to spend a request finding out.
    expect(page.url()).toBe(from);
  });
});

/**
 * The amount parser, exercised against the endpoint directly.
 *
 * Posted rather than typed, on purpose. The browser's `pattern` attribute
 * would refuse half of these before they were sent, and the whole question
 * here is what the SERVER does when something that is not a browser posts to
 * it — which is the only version of this question that matters, because the
 * endpoint is public.
 *
 * This is the money. `parseFloat(x) * 100` is the ordinary way to write this
 * parser and it is wrong on specific values in ways that do not show up in
 * casual use, so every case below is one that has to keep being decided the
 * same way. Driven over HTTP because Playwright is the only test harness this
 * project has.
 */
test.describe('what the server accepts as an amount', () => {
  /** POST the form exactly as the page would, and report where it was sent
   *  next without following it there. */
  async function postAmount(
    request: import('@playwright/test').APIRequestContext,
    fields: Record<string, string>,
  ): Promise<string> {
    const response = await request.post('/api/checkout', {
      form: { mode: 'payment', ...fields },
      maxRedirects: 0,
    });
    // Every outcome is a 303 — success and failure alike. That is what keeps
    // the flow working without JavaScript, so it is worth asserting.
    expect(response.status(), 'the endpoint stopped answering with a redirect').toBe(303);
    return response.headers()['location'] ?? '';
  }

  const rejected: Array<[string, string]> = [
    ['fifteen hundred', 'words'],
    ['', 'empty'],
    ['.', 'a bare decimal point'],
    ['-500', 'a negative'],
    ['1e5', 'exponent notation'],
    ['10.999', 'three decimals — rounding this would invent a number nobody typed'],
    ['4.99', 'below the stated $5 floor'],
    ['50000.01', 'above the stated $50,000 ceiling'],
    ['1 500', 'an inner space'],
    ['99999999999999', 'past the digit cap, where a float stops being exact'],
  ];

  for (const [amount, why] of rejected) {
    test(`rejects ${JSON.stringify(amount)} — ${why}`, async ({ request }) => {
      const location = await postAmount(request, { amount });
      expect(location, `${JSON.stringify(amount)} was not rejected`).toContain('error=amount');
    });
  }

  const accepted: Array<[string, string]> = [
    ['5', 'exactly the floor'],
    ['50000', 'exactly the ceiling'],
    ['1500', 'whole dollars'],
    ['1500.00', 'trailing zeros'],
    ['11.90', 'the classic float-rounding case'],
    ['1,500.50', 'thousands separators, as pasted off an invoice'],
    ['$2500', 'a leading currency symbol'],
    ['  750  ', 'surrounding whitespace'],
    ['10.5', 'one decimal place, meaning fifty cents'],
  ];

  for (const [amount, why] of accepted) {
    test(`accepts ${JSON.stringify(amount)} — ${why}`, async ({ request }) => {
      const location = await postAmount(request, { amount });
      expect(location, `${JSON.stringify(amount)} was rejected`).not.toContain('error=amount');
      expect(location).toMatch(HANDED_ON);
    });
  }

  test('rejects an over-long invoice reference', async ({ request }) => {
    const location = await postAmount(request, { amount: '1500', reference: 'x'.repeat(200) });
    expect(location).toContain('error=reference');
  });

  test('refuses a mode it does not recognise', async ({ request }) => {
    // `mode` is checked against a fixed set rather than passed through, so
    // this can never become a way to drive the Stripe API from outside.
    const response = await request.post('/api/checkout', {
      form: { mode: 'free', amount: '1500' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers()['location'] ?? '').toContain('error=mode');
  });
});

test.describe('the confirmation page', () => {
  test('confirms nothing on the strength of the URL alone', async ({ page }) => {
    // The security property of /pay/done in one test. A fabricated session id
    // must never produce a "payment received" page: the answer comes from
    // asking Stripe, and Stripe does not know this id.
    await page.goto('/pay/done?session_id=cs_test_definitely_not_a_real_session');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nothing to confirm here');
    await expect(page.locator('body')).not.toContainText('Payment received.');
  });

  test('says something sensible when opened directly', async ({ page }) => {
    const problems = watchConsole(page);

    await page.goto('/pay/done');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nothing to confirm here');
    await expect(page.getByRole('link', { name: 'Back to the front page' })).toBeVisible();

    expect(problems).toEqual([]);
  });
});

/**
 * The webhook's signature check, in both directions.
 *
 * Testing only that forgeries are refused would be satisfied by a verifier
 * that rejected everything — including every genuine event, silently, in
 * production. So the accepting case is here too, signed with the same
 * throwaway secret `playwright.config.ts` gives the test server.
 */
test.describe('the Stripe webhook', () => {
  /**
   * The secret the SERVER will actually verify against — which is not always
   * the one playwright.config.ts sets.
   *
   * `lib/stripe.ts` reads the Cloudflare context first and only falls back to
   * `process.env`, and `initOpenNextCloudflareForDev()` loads `.dev.vars` even
   * under `next start`. So on a machine that has a real `.dev.vars` — i.e.
   * anyone who has actually set this project up — that file wins and a payload
   * signed with the config's value is correctly rejected.
   *
   * Resolving it the same way the server does keeps this test honest in both
   * places: it verifies the real signature path against whatever secret is in
   * force, rather than passing only in CI's empty environment. Changing the
   * app's precedence to make a test simpler would be the wrong repair — the
   * Cloudflare binding SHOULD outrank a stray environment variable in
   * production.
   */
  function effectiveSecret(): string {
    try {
      const match = /^STRIPE_WEBHOOK_SECRET=(.*)$/m.exec(readFileSync('.dev.vars', 'utf8'));
      const value = match?.[1]?.trim();
      if (value && value.startsWith('whsec_')) return value;
    } catch {
      // No .dev.vars — CI, or a fresh clone. The config's value is in force.
    }
    return 'whsec_e2e_not_a_real_secret';
  }

  const SECRET = effectiveSecret();

  const event = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_fake', amount_total: 100000, currency: 'usd' } },
  });

  /** The header Stripe would send, built the way Stripe builds it: HMAC-SHA256
   *  over `${timestamp}.${rawBody}`, hex encoded. */
  async function sign(body: string, secret: string, timestamp: number): Promise<string> {
    const { createHmac } = await import('node:crypto');
    const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    return `t=${timestamp},v1=${digest}`;
  }

  test('accepts a correctly signed event', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: event,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': await sign(event, SECRET, Math.floor(Date.now() / 1000)),
      },
    });

    // 204. If this ever starts failing, real events are being dropped and the
    // only symptom in production would be renewals nobody hears about.
    expect(response.status(), 'a correctly signed event was refused').toBe(204);
  });

  test('refuses an unsigned request', async ({ request }) => {
    // This endpoint is public and unauthenticated. The signature check is the
    // only thing between it and anyone who can send a POST, so "an unsigned
    // event is never acted on" is the most important assertion in this file.
    const response = await request.post('/api/stripe/webhook', {
      data: event,
      headers: { 'content-type': 'application/json' },
    });

    expect(response.ok(), 'an unsigned webhook was accepted').toBe(false);
    expect(response.status()).toBe(400);
  });

  test('refuses a forged signature', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: event,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=${'a'.repeat(64)}`,
      },
    });

    expect(response.ok(), 'a forged webhook signature was accepted').toBe(false);
    expect(response.status()).toBe(400);
  });

  test('refuses a valid signature on a payload that was altered in transit', async ({
    request,
  }) => {
    // Signed correctly, then the body changed — the amount doubled. This is
    // the attack the HMAC exists to stop, and it is the case a naive check
    // that only compared timestamps would wave through.
    const timestamp = Math.floor(Date.now() / 1000);
    const header = await sign(event, SECRET, timestamp);
    const tampered = event.replace('100000', '200000');

    const response = await request.post('/api/stripe/webhook', {
      data: tampered,
      headers: { 'content-type': 'application/json', 'stripe-signature': header },
    });

    expect(response.status(), 'a tampered payload was accepted').toBe(400);
  });

  test('refuses a replayed event outside the freshness window', async ({ request }) => {
    // Genuinely signed, an hour old. Without the timestamp tolerance a real
    // payload captured once would stay valid for ever.
    const stale = Math.floor(Date.now() / 1000) - 3600;

    const response = await request.post('/api/stripe/webhook', {
      data: event,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': await sign(event, SECRET, stale),
      },
    });

    expect(response.status(), 'a replayed event was accepted').toBe(400);
  });
});
