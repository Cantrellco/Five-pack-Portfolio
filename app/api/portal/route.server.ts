/**
 * Opens Stripe's billing portal for whoever just set up a retainer, so they
 * can change the card on it or cancel it without going through me.
 *
 * A form POST and a 303, exactly like the checkout route, and for the same
 * reason: cancelling a subscription must not be the one thing on this site
 * that needs JavaScript.
 *
 * On the authorisation here, which is worth being explicit about because it
 * is unusual: the only credential is the Checkout Session id, which reached
 * the payer in their own redirect URL. Knowing it is treated as proof of
 * being the person who completed that session. That is the pattern Stripe's
 * own quickstarts use for exactly this hand-off, and the alternatives are
 * worse — looking a customer up by an email typed into a box would let
 * anyone open the portal for any address they can guess, which is a strictly
 * larger hole than the one this leaves.
 *
 * What keeps it narrow:
 *
 *  - the session must exist, be `complete`, and be a `subscription`;
 *  - session ids are unguessable and Stripe expires them;
 *  - the portal itself re-authenticates before it will do anything
 *    destructive, and only ever shows that one customer's own billing.
 *
 * For a returning customer weeks later, the right door is the portal's own
 * email login link, configured in the Stripe dashboard — not a lookup
 * endpoint on this site. See README.
 */
import { StripeError, idOf, readStripeConfig, stripeGet, stripePost } from '@/lib/stripe';
import type { CheckoutSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const fail = () => Response.redirect(`${origin}/pay?error=stripe`, 303);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail();
  }

  const sessionId = String(form.get('session_id') ?? '').trim();
  // Shape check before spending a network call on it. Stripe's Checkout
  // Session ids are `cs_` prefixed; anything else is not worth asking about.
  if (!sessionId.startsWith('cs_') || sessionId.length > 200) return fail();

  const config = await readStripeConfig();
  if (!config) return Response.redirect(`${origin}/pay?error=config`, 303);

  try {
    const session = await stripeGet<CheckoutSession>(
      config,
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    );

    // All three conditions, not just the id resolving. An `open` session is
    // one nobody has paid for, and a `payment` session has no subscription to
    // manage — neither should open a billing portal.
    if (session.status !== 'complete') return fail();
    if (session.mode !== 'subscription') return fail();

    const customer = idOf(session.customer);
    if (!customer) return fail();

    const portal = await stripePost<{ url?: string | null }>(config, '/billing_portal/sessions', {
      customer,
      return_url: `${origin}/pay/done?session_id=${encodeURIComponent(sessionId)}`,
    });

    if (!portal.url) return fail();
    return Response.redirect(portal.url, 303);
  } catch (error) {
    // The likeliest cause in a fresh account is the billing portal never
    // having been configured in the dashboard, which Stripe reports as a
    // plain API error. Naming it in the log saves the next person the hunt.
    console.error(
      'portal: could not open billing portal (is the customer portal configured in Stripe?)',
      error instanceof StripeError ? `${error.status} ${error.message}` : error,
    );
    return fail();
  }
}
