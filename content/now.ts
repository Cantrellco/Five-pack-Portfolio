/**
 * The "now" line — one dated sentence in the About panel saying what is
 * currently on the bench. The sentence itself does NOT live here: it lives in
 * the NOW KV namespace (see wrangler.jsonc) so it can change without a
 * deploy. The owner updates it with:
 *
 *   wrangler kv key put --binding=NOW now '{"text":"...","date":"2026-08-01"}'
 *
 * This module carries only the static copy and policy around that sentence.
 * `components/NowLine.tsx` reads the value and renders nothing at all when
 * the binding is absent (next dev without wrangler, CI, e2e), the key is
 * unset, or the value has aged past `maxAgeDays` — a stale "now" is worse
 * than none.
 */
export const nowCopy = {
  /** Eyebrow ahead of the sentence, set in the `.label` voice. */
  label: 'Now',

  /** The key the value is stored under in the NOW namespace. */
  kvKey: 'now',

  /** Days after the value's `date` at which the line stops rendering. */
  maxAgeDays: 45,

  /**
   * Month names for date formatting. Fixed English names over UTC date parts
   * — never `toLocaleDateString` with an ambient locale — so the server
   * output is deterministic regardless of where it renders.
   */
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
} as const;
