/**
 * Creates a Stripe Checkout Session and sends the reader to it.
 *
 * This handler is the reason the payment flow needs no JavaScript at all.
 * The page posts an ordinary `<form method="post">`, this returns a 303, and
 * the browser follows it to Stripe — the same sequence a browser has
 * performed since before any of this site's other features existed. Every
 * failure path is also a 303, back to `/pay` with an error code the page has
 * copy for, so a reader with scripting off sees exactly what a reader with
 * scripting on sees. Nothing here may ever start returning JSON that only a
 * `fetch` could read.
 *
 * `.server.ts` rather than `.ts`: `next.config.ts` only puts that extension
 * in `pageExtensions` for the server-rendered build, so this route does not
 * exist at all in the GitHub Pages static export, which has no server to run
 * it. See the note there.
 *
 * The amount is read from the form and validated HERE. The page's `min`,
 * `max` and `inputmode` attributes are a courtesy to whoever is typing; they
 * are not a control. Anything can post to this URL.
 */
import {
  CURRENCY,
  MAX_CENTS,
  MAX_REFERENCE_LENGTH,
  MIN_CENTS,
  payCopy,
  type PayErrorCode,
} from '@/content/pay';
import { parseAmountToCents } from '@/lib/money';
import { StripeError, readStripeConfig, stripePost, type FormValue } from '@/lib/stripe';

/** Anything this route touches is per-request. Declaring it stops Next from
 *  trying to reason about caching a handler that must never be cached. */
export const dynamic = 'force-dynamic';

/** The two things the form is allowed to ask for. Checked against the posted
 *  value rather than passed through, so `mode` can never become a way to
 *  drive the Stripe API from outside. */
const MODES = new Set(['payment', 'subscription']);

/**
 * Send the reader back to the form with a reason.
 *
 * `form` names WHICH of the two forms this came from, so the page can mark
 * that one's amount field and leave the other alone. Without it a bad number
 * in the invoice box lit up the retainer box as well, telling someone their
 * monthly amount was wrong when they had not entered one. It is omitted only
 * when the mode itself was unreadable, which is the one case where there is
 * no honest answer to which form it was.
 */
function back(origin: string, error: PayErrorCode, form?: string): Response {
  const suffix = form ? `&form=${encodeURIComponent(form)}` : '';
  // 303 rather than 302: it tells the browser to follow with GET. A 302 after
  // a POST leaves older clients free to re-POST to the redirect target, which
  // on a payment form is the one thing worth being pedantic about.
  return Response.redirect(`${origin}/pay?error=${error}${suffix}`, 303);
}

export async function POST(request: Request): Promise<Response> {
  // The public origin this request actually arrived on, so the URLs handed to
  // Stripe point back at the same host the reader is already looking at —
  // production, a `wrangler preview` on localhost, or a branch deployment,
  // with nothing to configure per environment.
  const origin = new URL(request.url).origin;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(origin, 'mode');
  }

  const mode = String(form.get('mode') ?? '');
  if (!MODES.has(mode)) return back(origin, 'mode');
  const isSubscription = mode === 'subscription';

  const amountCents = parseAmountToCents(String(form.get('amount') ?? ''));
  if (amountCents === null) return back(origin, 'amount', mode);
  if (amountCents < MIN_CENTS || amountCents > MAX_CENTS) return back(origin, 'amount', mode);

  // Only meaningful on a one-off; a retainer has no invoice number. Trimmed,
  // length-checked, and never used to build a URL or markup — it is handed to
  // Stripe as data and read back on the receipt.
  const rawReference = String(form.get('reference') ?? '').trim();
  if (rawReference.length > MAX_REFERENCE_LENGTH) return back(origin, 'reference', mode);
  const reference = isSubscription ? '' : rawReference;

  const config = await readStripeConfig();
  if (!config) return back(origin, 'config', mode);

  const copy = isSubscription ? payCopy.retainer : payCopy.invoice;

  // `price_data` inline rather than a Price created in the dashboard. The
  // amount is whatever the client was quoted, so there is no fixed price to
  // point at, and this keeps the account free of a Price object per invoice.
  const priceData: Record<string, FormValue> = {
    currency: CURRENCY,
    unit_amount: amountCents,
    product_data: { name: copy.productName },
  };
  if (isSubscription) {
    priceData['recurring'] = { interval: 'month' };
  }

  const params: Record<string, FormValue> = {
    mode,
    line_items: [{ price_data: priceData, quantity: 1 }],
    // `{CHECKOUT_SESSION_ID}` is a literal Stripe substitutes on redirect —
    // it must reach the API with the braces intact, which is why it is built
    // as a plain string here and not through URLSearchParams.
    success_url: `${origin}/pay/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay?status=cancelled`,
    billing_address_collection: 'auto',
  };

  if (reference) {
    params['metadata'] = { reference };
    // Two places on purpose: the metadata is what the webhook and the
    // dashboard read, the description is what appears on the payment itself
    // so the reference is legible without opening anything.
    params[isSubscription ? 'subscription_data' : 'payment_intent_data'] = {
      description: `${copy.productName} — ${reference}`,
      metadata: { reference },
    };
  }

  let session: { url?: string | null };
  try {
    session = await stripePost<{ url?: string | null }>(
      config,
      '/checkout/sessions',
      params,
      crypto.randomUUID(),
    );
  } catch (error) {
    // Server-side only. The reader gets the fixed `stripe` copy, which says
    // nothing was charged — true at this point, because no session exists.
    console.error(
      'checkout: could not create session',
      error instanceof StripeError ? `${error.status} ${error.message}` : error,
    );
    return back(origin, 'stripe', mode);
  }

  if (!session.url) {
    console.error('checkout: session created without a url');
    return back(origin, 'stripe', mode);
  }

  return Response.redirect(session.url, 303);
}
