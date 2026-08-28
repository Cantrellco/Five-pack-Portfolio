/**
 * Everything the payment page says, plus the two numbers that decide what it
 * will accept.
 *
 * Copy lives here for the same reason every other string does — a component
 * never inlines it. The money rules live here too, and that is deliberate:
 * the floor and the ceiling are editorial judgements about who this page is
 * for, not implementation details of the route handler that enforces them.
 * `app/api/checkout/route.server.ts` reads them; nothing else is allowed to
 * decide what a valid amount is.
 *
 * Nothing on this page is a price list. The amount is always one the client
 * has already been quoted somewhere else — an invoice, or an agreed monthly
 * rate — so the page's whole job is to take a number the reader already
 * knows and hand it to Stripe without editorialising about it.
 */

/** ISO 4217, lowercase — the casing Stripe's API wants. */
export const CURRENCY = 'usd';

/** The same currency in the voice a human reads. Stated on the page rather
 *  than implied by a dollar sign alone, which is ambiguous to most of the
 *  planet. */
export const CURRENCY_LABEL = 'USD';

/**
 * The accepted range, in the smallest currency unit (cents). Both are
 * enforced on the server and both are stated to the reader — a form that
 * rejects a number without having said what it would accept is a form that
 * wastes the reader's time.
 *
 * The floor is Stripe's practical minimum for a card charge, rounded to
 * something a person would say out loud. The ceiling is not a business
 * limit — it is a typo guard. The realistic failure here is a stray zero
 * turning 2,500 into 25,000, and a payment page that cheerfully charges the
 * stray zero is worse than one that asks.
 */
export const MIN_CENTS = 500; // $5.00
export const MAX_CENTS = 5_000_000; // $50,000.00

/** Longest invoice reference accepted. Stripe's metadata values run to 500
 *  characters; this is far below that because a reference is a short code
 *  off a document, not a message field. Anything longer is rejected rather
 *  than silently truncated — a half-recorded reference is worse than none. */
export const MAX_REFERENCE_LENGTH = 80;

export const payCopy = {
  /** Browser tab title. The layout sets no title template, so this is the
   *  whole string, and it carries the name the way every other title does. */
  title: 'Make a payment — Cody Cantrell',

  /** Head only. The page is noindex (see the route), so this is for whoever
   *  was sent the link, not for a crawler. */
  description: 'Pay an invoice or start a monthly retainer.',

  kicker: 'Payments',
  headline: 'Pay an invoice',

  /** The one paragraph under the headline. Says who the page is for, so a
   *  reader who arrived by accident can leave without filling anything in. */
  intro:
    'For work already quoted. If you have an invoice from me, the amount is on it — enter that. Card details are handled by Stripe and never touch this site.',

  backLabel: 'Back to the front page',

  /**
   * How the Contact panel points at this page.
   *
   * Deliberately quiet, and deliberately addressed to someone specific. The
   * contact panel's headline is about looking for a role; a payment link
   * sitting under it could read as soliciting from anyone who scrolled that
   * far, which is not what it is. Naming the reader it is for — a client who
   * already has an invoice — is what keeps it from reading as a sales
   * pitch on a page that is not selling anything.
   */
  contactLinkLabel: 'Existing client with an invoice? Pay it here',

  /** The one-off block. */
  invoice: {
    heading: 'One-time payment',
    blurb: 'A single charge for an invoice or a project deposit.',
    amountLabel: 'Amount',
    amountHint: 'Between $5 and $50,000.',
    referenceLabel: 'Invoice reference (optional)',
    referenceHint: 'The number on the invoice, if you have one. It appears on the receipt.',
    submit: 'Continue to payment',
    /** What Stripe shows on its own checkout page and on the receipt. The
     *  reader sees this string again after they have left this site, so it
     *  has to make sense out of context — "Invoice payment" does, "Payment"
     *  does not. */
    productName: 'Invoice payment — Cody Cantrell',
  },

  /** The recurring block. */
  retainer: {
    heading: 'Monthly retainer',
    blurb:
      'A recurring charge on the same date each month, at the rate we agreed. It continues until it is cancelled, and you can cancel it yourself at any time.',
    amountLabel: 'Amount per month',
    amountHint: 'Charged every month until cancelled.',
    submit: 'Set up monthly payment',
    productName: 'Monthly retainer — Cody Cantrell',
  },

  /** Sits at the foot of the page, under both forms. */
  footNote: 'Payments are processed by Stripe. This site never sees or stores your card number.',

  /**
   * The error banner's text, keyed by the code the route handler puts in the
   * URL. The handler redirects back here with `?error=<code>` rather than
   * rendering a message itself — that is what keeps the whole flow working
   * with scripting off, and it means no user input is ever echoed into the
   * page.
   *
   * Every message says what to do next. "Invalid amount" is a verdict;
   * "Enter an amount between..." is an instruction. The two that can fire
   * after a network call both state that nothing was charged, because that
   * is the only question a reader actually has at that moment.
   */
  errors: {
    amount: 'Enter an amount between $5 and $50,000, using digits — for example 1500 or 1500.00.',
    reference: `That reference is too long. Keep it to ${MAX_REFERENCE_LENGTH} characters or fewer.`,
    mode: 'Something went wrong with that form. Please try again.',
    stripe:
      'Stripe could not start that payment. Nothing has been charged. Please try again in a moment.',
    config:
      'Payments are not switched on yet. Nothing has been charged — please email me instead.',
  },

  /** Shown when the reader backs out of Stripe's page. Not an error: they
   *  chose it, and the page says so without scolding. */
  cancelledNotice: 'That payment was cancelled. Nothing has been charged.',

  /** The return page, after Stripe sends them back. */
  done: {
    title: 'Payment received — Cody Cantrell',
    kicker: 'Payments',

    /** One-time, confirmed paid. */
    paidHeadline: 'Payment received.',
    paidBody: 'Stripe has emailed your receipt. Nothing else is needed from you.',

    /** Subscription, confirmed active. */
    subscribedHeadline: 'Monthly payment set up.',
    subscribedBody:
      'The first charge has gone through and Stripe has emailed your receipt. It will repeat on the same date each month until you cancel it.',
    manageLabel: 'Manage or cancel this subscription',

    /**
     * Stripe redirects the moment its own page is finished, which is not the
     * same moment the bank has answered. A session can legitimately sit in
     * `processing` for a few seconds — and some payment methods for far
     * longer — so this is a real state, not an error, and it must never be
     * dressed up as either success or failure.
     */
    pendingHeadline: 'Payment is processing.',
    pendingBody:
      'Your bank has not answered yet. Stripe will email a receipt as soon as it does — there is no need to pay again or to refresh this page.',

    /** No session id, or a session that was never completed. This is what
     *  anyone who opens the address directly gets, which is why it claims
     *  nothing about a payment having happened. */
    unknownHeadline: 'Nothing to confirm here.',
    unknownBody:
      'This page confirms a payment after Stripe sends you back to it. If you have just paid and are seeing this, check your email for the receipt before trying again.',

    backLabel: 'Back to the front page',
  },
} as const;

/** The error codes the route handlers are allowed to redirect with. Derived
 *  from the copy above so the two can never drift: a code with no message is
 *  a type error, not a blank banner. */
export type PayErrorCode = keyof typeof payCopy.errors;

export function isPayErrorCode(value: string | undefined): value is PayErrorCode {
  return value !== undefined && Object.hasOwn(payCopy.errors, value);
}
