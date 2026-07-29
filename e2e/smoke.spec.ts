import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Messages emitted by the headless GL stack rather than by the page. Software
 * rasterisation plus Playwright's screenshot path produces these; they do not
 * occur on real hardware and nothing in the site can prevent them.
 */
const ENVIRONMENT_NOISE = /GL Driver Message|\[\.WebGL-0x|Automatic fallback to software WebGL/i;

/** Anything else the browser complains about is a failure, not a warning. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    if (ENVIRONMENT_NOISE.test(m.text())) return;
    problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

test('loads, names the person, and says nothing to the console', async ({ page }) => {
  const problems = watchConsole(page);

  await page.goto('/');
  await expect(page).toHaveTitle(/Cody Cantrell/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cody');
  await expect(page.getByRole('link', { name: /App Store/i }).first()).toBeVisible();

  // Give the deferred canvas time to load and start drawing.
  await page.waitForTimeout(3000);
  expect(problems).toEqual([]);
});

test('every in-page anchor reaches a real section', async ({ page }) => {
  await page.goto('/');

  const hrefs = await page.locator('a[href^="#"]').evaluateAll((links) =>
    links.map((l) => l.getAttribute('href')!).filter((h) => h.length > 1),
  );
  expect(hrefs.length).toBeGreaterThan(4);

  for (const href of hrefs) {
    await expect(page.locator(href), `${href} has no target`).toHaveCount(1);
  }
});

test('no horizontal overflow from 320px up', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `overflows at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('the skip link is reachable by keyboard and moves focus to the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skip = page.getByRole('link', { name: /skip to content/i });
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('the field is wired to scroll, not decoration', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  const atTop = await page.evaluate(() => window.__inkField?.liveResolve ?? -1);
  expect(atTop, 'field state should be exposed').toBeGreaterThanOrEqual(0);
  expect(atTop, 'the field is abstract at the top of the page').toBeLessThan(0.1);

  // Bring the figure the plot draws into onto the screen.
  await page.evaluate(() => {
    const el = document.getElementById('field-plot')!;
    const r = el.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - (window.innerHeight - r.height) / 2);
  });
  await page.waitForTimeout(2500);

  const atFigure = await page.evaluate(() => window.__inkField!.liveResolve);
  expect(atFigure, 'the field resolves while its figure is on screen').toBeGreaterThan(0.85);
});

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('the page is complete and readable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cantrell');
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
    await expect(page.getByRole('link', { name: /Open in the App Store/i })).toBeVisible();

    // The reveal gate must never leave content hidden without scripting.
    const hidden = await page.locator('[data-reveal]').evaluateAll(
      (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
    );
    expect(hidden).toBe(0);

    // The static frame stands in for the canvas.
    await expect(page.locator('.field-poster')).toHaveCSS('opacity', '1');
  });
});

test.describe('with WebGL unavailable', () => {
  test('falls back to the static frame and stays quiet', async ({ page }) => {
    const problems = watchConsole(page);
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (String(type).includes('webgl')) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (real as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    await expect(page.locator('.field-layer canvas')).toHaveCount(0);
    await expect(page.locator('.field-poster')).toHaveCSS('opacity', '1');
    await expect(page.locator('.plot-fallback')).toHaveCSS('opacity', '1');
    expect(problems).toEqual([]);
  });
});

test.describe('with reduced motion', () => {
  test('shows everything at once and never starts the canvas', async ({ page }) => {
    // emulateMedia rather than the `reducedMotion` context option: the option
    // does not reliably reach matchMedia here, and a preference test that
    // silently tests the default preference is worse than no test.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true);

    await page.goto('/');
    await page.waitForTimeout(2000);

    const hidden = await page.locator('[data-reveal]').evaluateAll(
      (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
    );
    expect(hidden).toBe(0);
    await expect(page.locator('.field-layer canvas')).toHaveCount(0);
  });
});
