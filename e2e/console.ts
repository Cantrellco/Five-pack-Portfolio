import type { ConsoleMessage, Page } from '@playwright/test';

/**
 * Messages emitted by the headless GL stack rather than by the page. Software
 * rasterisation plus Playwright's screenshot path produces these; they do not
 * occur on real hardware and nothing in the site can prevent them.
 */
export const ENVIRONMENT_NOISE =
  /GL Driver Message|\[\.WebGL-0x|Automatic fallback to software WebGL/i;

/**
 * Collect everything the browser complains about, so a test can assert the
 * list is empty.
 *
 * Shared by both spec files rather than copied into each. "Zero console
 * errors AND zero console warnings" is a rule in CLAUDE.md, and a rule
 * enforced by two definitions that can drift is a rule with a hole in it.
 */
export function watchConsole(page: Page): string[] {
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
