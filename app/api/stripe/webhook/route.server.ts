/**
 * Stripe's webhook endpoint.
 *
 * This exists because of the monthly retainer. A one-off payment could just
 * about be confirmed by the redirect back to `/pay/done` — the payer is
 * sitting right there. A subscription cannot: the second month's charge, a
 * card that expires, a bank that declines, a customer who cancels from the
 * billing portal all happen with no browser open and nobody to redirect. The
 * only way this site ever learns about them is here.
 *
 * Two rules govern everything below.
 *
 * 1. VERIFY FIRST. This URL is public and unauthenticated — anyone can POST
 *    to it, and a forged `checkout.session.completed` is trivial to write.
 *    The signature check is the whole security boundary, so nothing is read
 *    out of the body until it passes.
 *
 * 2. ANSWER 200 FOR ANYTHING UNDERSTOOD. Stripe retries non-2xx responses
 *    with backoff for days. A handler that throws on an event type it has no
 *    branch for turns an unremarkable notification into a retry storm and,
 *    eventually, a disabled endpoint. Unknown types are acknowledged, not
 *    rejected.
 *
 * What it does with a verified event today is write one line to the log.
 * That is deliberate rather than unfinished: Stripe's own dashboard is the
 * system of record for money, and a second copy kept here would be a thing
 * that can silently disagree with it. The extension point — email a
 * notification, write to a KV namespace, ping a phone — is the switch at the
 * bottom, and it is the only place that needs to change.
 */
import { readWebhookSecret, verifyStripeSignature } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** The slice of an Event this handler reads. Everything past `type` is
 *  logged rather than acted on, so it stays loose on purpose. */
type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

/** Pull a few identifying fields off whatever object the event carried,
 *  without assuming which kind it is. Used only to make the log line worth
 *  reading — never to make a decision. */
function describe(object: Record<string, unknown> | undefined): string {
  if (!object) return '';
  const parts: string[] = [];
  const id = object['id'];
  if (typeof id === 'string') parts.push(id);
  const amount = object['amount_total'] ?? object['amount_paid'] ?? object['amount'];
  if (typeof amount === 'number') {
    const currency = typeof object['currency'] === 'string' ? object['currency'] : '';
    parts.push(`${amount} ${currency}`.trim());
  }
  const email = object['customer_email'];
  if (typeof email === 'string') parts.push(email);
  return parts.join(' ');
}

export async function POST(request: Request): Promise<Response> {
  // Only the signing secret. This endpoint never calls the Stripe API, so a
  // missing STRIPE_SECRET_KEY must not stop it verifying events.
  const webhookSecret = await readWebhookSecret();

  // No signing secret configured means this endpoint cannot tell a real
  // event from a forged one. It refuses everything rather than trusting
  // anything — 503, because the deployment is misconfigured, and Stripe's
  // retries will deliver the event once the secret is set.
  if (!webhookSecret) {
    console.error('stripe webhook: STRIPE_WEBHOOK_SECRET is not set — refusing the event');
    return new Response('webhook not configured', { status: 503 });
  }

  // The RAW text, read before anything parses it. The signature covers these
  // exact bytes: parsing to an object and re-serialising can reorder keys and
  // normalise whitespace, and either one makes a genuine event fail to
  // verify. Nothing may be inserted between here and the check below.
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    // 400, not 401: Stripe treats 4xx as a permanent failure and stops
    // retrying, which is right — a payload that does not verify will never
    // verify no matter how many times it is redelivered.
    console.warn('stripe webhook: rejected an event with a bad or missing signature');
    return new Response('invalid signature', { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    // Signed by us and still not JSON should be impossible. Refusing to
    // retry is still the right answer.
    console.error('stripe webhook: verified payload was not JSON');
    return new Response('malformed payload', { status: 400 });
  }

  const type = event.type ?? 'unknown';
  const detail = describe(event.data?.object);

  switch (type) {
    // A Checkout Session finished — the one-off is paid, or the
    // subscription's first invoice is settled and the retainer is live.
    case 'checkout.session.completed':
      console.info(`stripe: checkout completed ${detail}`);
      break;

    // Delayed payment methods resolve here rather than at the redirect.
    case 'checkout.session.async_payment_succeeded':
      console.info(`stripe: delayed payment succeeded ${detail}`);
      break;
    case 'checkout.session.async_payment_failed':
      console.warn(`stripe: delayed payment failed ${detail}`);
      break;

    // The retainer, month after month. `invoice.paid` is the renewal
    // actually going through; the failure is the one worth acting on, since
    // it is the case where someone has to be told their card stopped working.
    case 'invoice.paid':
      console.info(`stripe: invoice paid ${detail}`);
      break;
    case 'invoice.payment_failed':
      console.warn(`stripe: invoice payment FAILED ${detail}`);
      break;

    case 'customer.subscription.updated':
      console.info(`stripe: subscription updated ${detail}`);
      break;
    case 'customer.subscription.deleted':
      console.info(`stripe: subscription cancelled ${detail}`);
      break;

    default:
      // Acknowledged on purpose. See rule 2 at the top of the file: an
      // endpoint subscribed to more event types than it handles is normal,
      // and refusing them would only generate retries.
      console.info(`stripe: unhandled event ${type}`);
      break;
  }

  return new Response(null, { status: 204 });
}
