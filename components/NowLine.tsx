import { getCloudflareContext } from '@opennextjs/cloudflare';
import { nowCopy } from '@/content/now';

/**
 * A single dated one-liner in the About panel, read from the NOW KV
 * namespace at render time (build-time prerender and each ISR regeneration —
 * the same cadence as the GitHub summary, so updating the KV value shows up
 * on the next revalidation, not instantly).
 *
 * This component's contract is that it can NEVER take the page down or dirty
 * a console. Every failure mode — no Cloudflare context (plain `next build`
 * on a machine without workerd, e2e, CI), no NOW binding, no value under the
 * key, malformed JSON, a date that does not parse, or a date older than
 * `nowCopy.maxAgeDays` — renders nothing, silently. The line is a garnish;
 * its absence is the designed default, which is also why e2e never needs a
 * KV namespace to stay green.
 *
 * Date formatting is manual over UTC parts (fixed month names from
 * `content/now.ts`), never locale-dependent, so the server output is
 * byte-identical wherever it renders.
 */

/**
 * The structural slice of a KV namespace this component uses. Typed locally
 * because the project deliberately ships no `@cloudflare/workers-types` and
 * no generated `cloudflare-env.d.ts` — a one-method shape is all the
 * coupling this needs.
 */
type NowNamespace = {
  get(key: string): Promise<string | null>;
};

declare global {
  interface CloudflareEnv {
    /** Bound in wrangler.jsonc; absent in next dev/CI until created. */
    NOW?: NowNamespace;
  }
}

const MS_PER_DAY = 86_400_000;

type NowValue = {
  text: string;
  /** Formatted for display, e.g. "August 1, 2026". */
  date: string;
};

/** "2026-08-01" -> "August 1, 2026"; null for anything that does not parse. */
function formatNowDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  if (!year || !month || !day) return null;
  const monthName = nowCopy.months[Number(month) - 1];
  if (!monthName) return null;
  return `${monthName} ${Number(day)}, ${year}`;
}

async function readNowValue(): Promise<NowValue | null> {
  let raw: string | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.NOW) return null;
    raw = await env.NOW.get(nowCopy.kvKey);
  } catch {
    // No Cloudflare context at all — plain node builds, test runners.
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { text, date } = parsed as { text?: unknown; date?: unknown };
  if (typeof text !== 'string' || text.trim() === '') return null;
  if (typeof date !== 'string') return null;

  const formatted = formatNowDate(date);
  if (!formatted) return null;

  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return null;
  if (Date.now() - timestamp > nowCopy.maxAgeDays * MS_PER_DAY) return null;

  return { text: text.trim(), date: formatted };
}

export async function NowLine() {
  const value = await readNowValue();
  if (!value) return null;

  return (
    <p className="mt-[var(--sp-lg)] flex flex-wrap items-baseline gap-x-[var(--sp-2xs)] gap-y-[var(--sp-3xs)]">
      <span className="label">{nowCopy.label}</span>
      <span className="text-sm">{value.text}</span>
      <span className="mono text-graphite">{value.date}</span>
    </p>
  );
}
