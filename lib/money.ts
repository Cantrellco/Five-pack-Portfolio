/**
 * Turning what someone typed into an integer number of cents, and back into
 * something a person reads.
 *
 * This is a separate file with no imports because it is the one piece of the
 * payment flow where being approximately right is indistinguishable, at a
 * glance, from being wrong — and where being wrong means charging the wrong
 * amount of someone else's money.
 *
 * The rule the whole file exists to enforce: NEVER use floating point for
 * money. `parseFloat('11.90') * 100` is 1189.9999999999998, and `Math.round`
 * papers over that particular case while leaving the class of bug intact.
 * The parser below never produces a fractional number at all — it splits the
 * string on the decimal point and does integer arithmetic on each half, so
 * there is no rounding step to get right.
 */

/**
 * The most digits accepted before the decimal point.
 *
 * Not a business rule — the caller's min/max does that job. This is purely a
 * guard on `Number()` itself: past 15 significant digits a JS number stops
 * being able to represent consecutive integers, so a long enough run of
 * digits would parse to something that is not the number that was typed.
 * Ten digits caps the whole-dollar part below that by a wide margin.
 */
const MAX_WHOLE_DIGITS = 10;

/**
 * Parse a typed amount into whole cents, or null if it is not an amount.
 *
 * Accepts what people actually type into a money field: `1500`, `1500.00`,
 * `$1,500`, `1,500.5`, and the same with padding. Rejects everything else —
 * negatives, exponents, a bare decimal point, more than two decimal places,
 * multiple decimal points, and any other character at all.
 *
 * Two decimal places is the ceiling rather than something to round: a third
 * digit means the reader typed something this function has no business
 * interpreting, and quietly rounding 10.999 to 11.00 invents a number nobody
 * asked for. It is rejected and the form says so.
 *
 * Returns null rather than throwing. Every caller has to decide what to show
 * the reader anyway, and an exception here would just be a different way of
 * writing the same branch.
 */
export function parseAmountToCents(raw: string): number | null {
  if (typeof raw !== 'string') return null;

  // Strip only presentation: surrounding space, one leading currency symbol,
  // and the thousands separators a keyboard or a paste can bring along.
  // Nothing here changes the value, so doing it before validation cannot
  // turn an invalid amount into a valid one.
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '').trim();
  if (cleaned === '') return null;

  // The whole grammar, in one place. No sign, no exponent, at least one
  // digit before the point, at most two after it, and the point itself only
  // if something follows it.
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;

  const [, whole, fraction] = match;
  if (whole === undefined) return null;
  if (whole.length > MAX_WHOLE_DIGITS) return null;

  // `padEnd` is what makes `.5` mean fifty cents rather than five. Doing it
  // as string manipulation keeps the arithmetic below in integers.
  const cents = Number(whole) * 100 + Number((fraction ?? '').padEnd(2, '0'));

  // Belt and braces. The regex and the digit cap already guarantee this, so
  // reaching it would mean one of them has been loosened without the other
  // being reconsidered.
  if (!Number.isSafeInteger(cents)) return null;

  return cents;
}

/**
 * Whole cents to a display string, for the confirmation page.
 *
 * `Intl.NumberFormat` with an explicit `en-US` locale rather than the
 * runtime's default: this renders on the server, and a formatter that reads
 * the host's locale would produce different output on a Cloudflare edge
 * machine than it does in a local build. Currency formatting is one of the
 * places where "wherever it happens to run" is not a defensible answer.
 *
 * The division by 100 is safe in a way the parse is not — it is the last
 * step, its result is immediately turned into a string by a formatter that
 * rounds to the currency's own precision, and no arithmetic happens after
 * it.
 */
export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
