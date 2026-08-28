import type { Metadata } from 'next';
import { CURRENCY_LABEL, MAX_REFERENCE_LENGTH, isPayErrorCode, payCopy } from '@/content/pay';

/**
 * The payment page. Two forms, no JavaScript, no card fields.
 *
 * Not part of the deck. The deck is the portfolio — who this is and what they
 * have made — and a payment form is not a document about the person; it is a
 * tool for someone who has already decided. Giving it its own address also
 * means it can be sent to a client on its own, and that the front page's
 * bundle and its Lighthouse numbers are untouched by anything here.
 *
 * `page.server.tsx`, not `page.tsx`. `next.config.ts` only includes the
 * `.server.tsx` extension in `pageExtensions` for the server-rendered build,
 * so this route is invisible to `npm run build:pages`. That is not tidiness:
 * the static export has no server, this page is dynamic, and Next fails the
 * export outright rather than skipping it.
 *
 * Like `not-found.tsx`, and for the same reason, nothing here carries
 * `data-reveal` — that attribute hides an element until MotionProvider
 * reveals it, and MotionProvider is mounted by the home page. A form that
 * arrives invisible is not a form.
 *
 * The whole flow is a form POST and a 303 — no Stripe.js, no card fields, no
 * `fetch`. That is what makes it work with scripting off, and it is why this
 * route adds no client component of its own: nothing on this page has any
 * behaviour for one to implement. (Next's own App Router runtime still
 * loads, as it does on every route; the point is that the payment works
 * whether or not it arrives.)
 *
 * Keeping Stripe.js off this page is also what keeps it inside the
 * performance budget in CLAUDE.md. Embedded Elements would mean a
 * third-party script and an iframe on a route whose entire content is two
 * text inputs.
 */

export const metadata: Metadata = {
  title: payCopy.title,
  description: payCopy.description,
  // A payment form has no business in a search index. It is reached from a
  // link in an invoice or from the contact panel, never from a query.
  robots: { index: false, follow: false },
};

/** Reading the query string is what makes this route dynamic. Stated rather
 *  than inferred, so the reason is visible next to the code that depends
 *  on it. */
export const dynamic = 'force-dynamic';

type PayPageProps = {
  searchParams: Promise<{ error?: string; status?: string; form?: string }>;
};

/**
 * The amount field, twice over — once per form.
 *
 * `type="text"` with `inputMode="decimal"` rather than `type="number"`: a
 * number input rejects the thousands separators people paste in, disagrees
 * with itself across locales about the decimal mark, and hangs a spinner off
 * a money field where nudging the amount by one is meaningless. The keyboard
 * that matters on a phone is what `inputMode` asks for, and it asks for it
 * without any of that.
 *
 * `pattern` is a courtesy — native constraint validation catches an obvious
 * typo before a round trip, and it does so with scripting off. It is not a
 * control. `app/api/checkout/route.server.ts` re-parses this from scratch
 * and is the only thing that decides what a valid amount is.
 */
function AmountField({
  id,
  label,
  hint,
  invalid,
}: {
  id: string;
  label: string;
  hint: string;
  invalid: boolean;
}) {
  return (
    <div className="pay-row">
      <label className="label pay-label" htmlFor={id}>
        {label} <span className="pay-currency">{CURRENCY_LABEL}</span>
      </label>

      <div className="money-input">
        {/* Decorative. The accessible name already carries the currency via
            the label above, so a screen reader announcing a bare "$" here
            would only say it twice. */}
        <span className="money-prefix" aria-hidden="true">
          $
        </span>
        <input
          className="pay-input"
          id={id}
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required
          maxLength={20}
          pattern="\$?[0-9][0-9,]*(\.[0-9]{1,2})?"
          title={hint}
          aria-describedby={`${id}-hint`}
          aria-invalid={invalid || undefined}
        />
      </div>

      <p className="pay-hint" id={`${id}-hint`}>
        {hint}
      </p>
    </div>
  );
}

export default async function PayPage({ searchParams }: PayPageProps) {
  const { error, status, form } = await searchParams;

  // The code is only ever read out of this map — never rendered as itself.
  // A query parameter is reader-controlled input, and the one thing this page
  // will not do is put it on the screen.
  const errorMessage = isPayErrorCode(error) ? payCopy.errors[error] : null;
  const cancelled = status === 'cancelled';

  // Which form the reader actually submitted, so only that one's amount field
  // is marked. Compared against the two known values rather than trusted —
  // like `error`, this arrives in the URL and anyone can type it. When it says
  // nothing recognisable, neither field is marked and the banner alone
  // carries the message, which is the right answer for "we cannot tell".
  const amountInvalid = error === 'amount';
  const invoiceInvalid = amountInvalid && form === 'payment';
  const retainerInvalid = amountInvalid && form === 'subscription';

  return (
    <>
      {/* The same poster the home page renders as its WebGL-off fallback and
          the 404 puts behind its type — one cached request, no canvas, no
          client component. Dimmed from the layer so it reads as texture. */}
      <div className="field-layer" aria-hidden="true" style={{ opacity: 0.45 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG
            drawn from the field data; next/image would only add a request. */}
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
        <main id="main" tabIndex={-1} className="outline-none">
          <div className="shell section">
            <p className="label kicker">{payCopy.kicker}</p>

            <h1 className="display-1 max-w-[18ch]">{payCopy.headline}</h1>

            <p className="mt-[var(--sp-md)] max-w-[var(--measure)]">{payCopy.intro}</p>

            {errorMessage ? (
              <p className="pay-notice pay-notice-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {cancelled ? (
              <p className="pay-notice" role="status">
                {payCopy.cancelledNotice}
              </p>
            ) : null}

            <div className="pay-forms">
              {/* ---- one-off ------------------------------------------- */}
              <section className="pay-block" aria-labelledby="pay-invoice-title">
                <h2 className="display-3" id="pay-invoice-title">
                  {payCopy.invoice.heading}
                </h2>
                <p className="pay-blurb">{payCopy.invoice.blurb}</p>

                <form method="post" action="/api/checkout">
                  {/* Which of the two forms this is. The handler checks it
                      against a fixed set — it is never passed through to
                      Stripe as-is. */}
                  <input type="hidden" name="mode" value="payment" />

                  <AmountField
                    id="invoice-amount"
                    label={payCopy.invoice.amountLabel}
                    hint={payCopy.invoice.amountHint}
                    invalid={invoiceInvalid}
                  />

                  <div className="pay-row">
                    <label className="label pay-label" htmlFor="invoice-reference">
                      {payCopy.invoice.referenceLabel}
                    </label>
                    <input
                      className="pay-input"
                      id="invoice-reference"
                      name="reference"
                      type="text"
                      autoComplete="off"
                      maxLength={MAX_REFERENCE_LENGTH}
                      aria-describedby="invoice-reference-hint"
                    />
                    <p className="pay-hint" id="invoice-reference-hint">
                      {payCopy.invoice.referenceHint}
                    </p>
                  </div>

                  <button type="submit" className="cta-ghost cursor-pointer">
                    {payCopy.invoice.submit}
                  </button>
                </form>
              </section>

              {/* ---- recurring ----------------------------------------- */}
              <section className="pay-block" aria-labelledby="pay-retainer-title">
                <h2 className="display-3" id="pay-retainer-title">
                  {payCopy.retainer.heading}
                </h2>
                <p className="pay-blurb">{payCopy.retainer.blurb}</p>

                <form method="post" action="/api/checkout">
                  <input type="hidden" name="mode" value="subscription" />

                  <AmountField
                    id="retainer-amount"
                    label={payCopy.retainer.amountLabel}
                    hint={payCopy.retainer.amountHint}
                    invalid={retainerInvalid}
                  />

                  <button type="submit" className="cta-ghost cursor-pointer">
                    {payCopy.retainer.submit}
                  </button>
                </form>
              </section>
            </div>

            <p className="pay-foot mono">{payCopy.footNote}</p>

            <p className="mt-[var(--sp-lg)]">
              {/* A plain anchor, the same call `not-found.tsx` makes and for
                  the same reasons: the link has to work before — or without —
                  any bundle, and next/link would prefetch the front page for
                  every reader who opened a payment form, which is the one
                  navigation here that most of them will not make. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="link-block" href="/">
                {payCopy.backLabel}
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
