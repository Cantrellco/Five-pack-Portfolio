import type { Metadata } from 'next';
import { payCopy } from '@/content/pay';
import { formatCents } from '@/lib/money';
import { StripeError, readStripeConfig, stripeGet } from '@/lib/stripe';
import type { CheckoutSession } from '@/lib/stripe';

/**
 * Where Stripe sends the payer back to.
 *
 * The one rule this page exists to obey: it does not believe the URL. Landing
 * here means Stripe redirected the browser, and a browser can be pointed at
 * any address by anyone — so `?session_id=...` is treated as a claim to be
 * checked, never as the fact itself. The session is fetched from Stripe with
 * the secret key and the answer comes from `status` and `payment_status` on
 * that response. Nothing about the amount, the currency, or whether money
 * moved is read out of the query string, which is also why there is no
 * version of this page that can be made to say "payment received" by typing
 * a URL.
 *
 * Three outcomes, and the middle one is the one usually got wrong: Stripe
 * redirects when ITS page is finished, which is not the same instant the bank
 * has answered. A session can sit `complete` but not yet `paid`. That is
 * reported as processing — not as success, which would be a lie, and not as
 * failure, which would send someone to pay a second time.
 */

export const metadata: Metadata = {
  title: payCopy.done.title,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type DonePageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

type Outcome =
  | { kind: 'paid'; amount: string | null; subscription: boolean; sessionId: string }
  | { kind: 'pending' }
  | { kind: 'unknown' };

async function resolveOutcome(sessionId: string | undefined): Promise<Outcome> {
  // Someone opening this address directly, or a mangled link. Says nothing
  // about a payment because nothing is known about one.
  if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > 200) {
    return { kind: 'unknown' };
  }

  const config = await readStripeConfig();
  if (!config) return { kind: 'unknown' };

  let session: CheckoutSession;
  try {
    session = await stripeGet<CheckoutSession>(
      config,
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    );
  } catch (error) {
    console.error(
      'pay/done: could not read the checkout session',
      error instanceof StripeError ? `${error.status} ${error.message}` : error,
    );
    return { kind: 'unknown' };
  }

  // `open` (never finished) and `expired` both mean there is nothing to
  // confirm. Only a completed session is worth reading further.
  if (session.status !== 'complete') return { kind: 'unknown' };

  // `no_payment_required` is a legitimate paid state — a fully discounted
  // session — and treating it as pending would strand someone on a page
  // waiting for a charge that is never coming.
  const settled =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!settled) return { kind: 'pending' };

  const amount =
    typeof session.amount_total === 'number' && session.currency
      ? formatCents(session.amount_total, session.currency)
      : null;

  return {
    kind: 'paid',
    amount,
    subscription: session.mode === 'subscription',
    sessionId,
  };
}

export default async function PayDonePage({ searchParams }: DonePageProps) {
  const { session_id: sessionId } = await searchParams;
  const outcome = await resolveOutcome(sessionId);

  const headline =
    outcome.kind === 'paid'
      ? outcome.subscription
        ? payCopy.done.subscribedHeadline
        : payCopy.done.paidHeadline
      : outcome.kind === 'pending'
        ? payCopy.done.pendingHeadline
        : payCopy.done.unknownHeadline;

  const body =
    outcome.kind === 'paid'
      ? outcome.subscription
        ? payCopy.done.subscribedBody
        : payCopy.done.paidBody
      : outcome.kind === 'pending'
        ? payCopy.done.pendingBody
        : payCopy.done.unknownBody;

  return (
    <>
      <div className="field-layer" aria-hidden="true" style={{ opacity: 0.45 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- as on /pay:
            an inline SVG drawn from the field data, already cached by now. */}
        <img
          src="/field/poster.svg"
          alt=""
          className="field-poster"
          width={1600}
          height={1000}
          decoding="async"
        />
      </div>

      <div className="page page-flow">
        <main id="main" tabIndex={-1} className="flex min-h-[100svh] items-center outline-none">
          <div className="shell section">
            <p className="label kicker">{payCopy.done.kicker}</p>

            <h1 className="display-1 max-w-[20ch]">{headline}</h1>

            {/* The figure, in the data voice, and only when Stripe actually
                reported one. It comes off the fetched session — never off
                the query string. */}
            {outcome.kind === 'paid' && outcome.amount ? (
              <p className="mono mt-[var(--sp-sm)] text-graphite">{outcome.amount}</p>
            ) : null}

            <p className="mt-[var(--sp-md)] max-w-[var(--measure)]">{body}</p>

            {/* Only for a retainer, and only once it is real. A form POST
                rather than a link: opening the portal creates a session at
                Stripe, which is a side effect and does not belong on a GET
                that a prefetcher or a back button could fire. */}
            {outcome.kind === 'paid' && outcome.subscription ? (
              <form className="mt-[var(--sp-md)]" method="post" action="/api/portal">
                <input type="hidden" name="session_id" value={outcome.sessionId} />
                <button type="submit" className="cta-ghost cursor-pointer">
                  {payCopy.done.manageLabel}
                </button>
              </form>
            ) : null}

            <p className="mt-[var(--sp-lg)]">
              {/* Plain anchor, as on /pay and in not-found.tsx. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="link-block" href="/">
                {payCopy.done.backLabel}
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
