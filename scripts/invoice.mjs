/**
 * Create — and optionally send — a Stripe invoice from the command line.
 *
 *   node scripts/invoice.mjs --to a@b.com --amount 2500 --for "Landing page"
 *   node scripts/invoice.mjs --to a@b.com --amount 2500 --for "Landing page" --send
 *
 * This is Stripe Invoicing, driven by script instead of by the dashboard. It
 * is the right tool for money someone OWES you — it produces a real invoice
 * with a number, a PDF, a due date, and Stripe's own reminder and retry
 * machinery behind it. The /pay page on the site is the other half: a door
 * for someone who already knows what to pay and wants to do it now. Neither
 * replaces the other, and this script does not touch the site at all.
 *
 * Contract
 * --------
 * Environment:
 *   STRIPE_SECRET_KEY   Read from the environment first, then from .dev.vars
 *                       so local use needs no extra setup. Never committed.
 *
 * Arguments:
 *   --to <email>        Required. The customer. Looked up by email and reused
 *                       if they already exist, so repeat clients do not
 *                       accumulate duplicate Customer objects.
 *   --amount <n>        Required. In DOLLARS, as written on the quote —
 *                       "2500" or "2500.00". Converted to cents by the same
 *                       integer parser the payment route uses.
 *   --for <text>        Required. The line item description. This is what the
 *                       client reads on the invoice, so it should name the
 *                       work, not the project code.
 *   --name <text>       Optional. Customer name, used when creating a new one.
 *   --due <days>        Optional, default 14. Days until due.
 *   --live              Use the live key from .stripe-live instead of the test
 *                       key in .dev.vars. Required to bill a real client.
 *   --send              Have STRIPE email it. WITHOUT this flag the invoice is
 *                       created as a draft and nothing leaves Stripe.
 *   --yes               Required IN ADDITION to --send when the key is live.
 *
 * Safety
 * ------
 * Two deliberate speed bumps, because an invoice is outward-facing and only
 * half-reversible — voiding one does not unsend the email a client already
 * read:
 *
 *   1. Nothing sends without --send. The default is a draft you can inspect
 *      in the dashboard and delete with no trace.
 *   2. On a LIVE key, --send alone is refused; it also needs --yes. A typo in
 *      an amount is cheap to fix in test mode and expensive to explain to a
 *      client.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/* ----------------------------------------------------------------- args */

function parseArgs(argv) {
  const out = { due: '14' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'send' || key === 'yes' || key === 'live') {
      out[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`--${key} needs a value`);
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

function fail(message) {
  console.error(`invoice: ${message}`);
  process.exit(1);
}

/**
 * Dollars to whole cents, without floating point.
 *
 * The same rule as lib/money.ts, restated here rather than imported because
 * that file is TypeScript inside the app and this is a plain node script with
 * no build step. If one changes, change both — the tests in e2e/pay.spec.ts
 * cover the app's copy, and the cases are listed there.
 */
function toCents(raw) {
  const cleaned = String(raw).trim().replace(/^\$/, '').replace(/,/g, '');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, whole, fraction] = match;
  if (whole.length > 10) return null;
  const cents = Number(whole) * 100 + Number((fraction ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/* ------------------------------------------------------------------ key */

/**
 * Where the key comes from, and why there are two places.
 *
 * `.dev.vars` is loaded by the dev server. A live key in there would mean a
 * test payment on localhost silently charges a real card, so it holds the
 * TEST key and nothing else. Live credentials live in `.stripe-live`, which
 * only this script reads and only when asked with `--live`. Both are
 * gitignored.
 *
 * The separation is the whole safety model here: billing a real client has to
 * be a thing you opt into by name, not something you can drift into by having
 * the wrong file open.
 */
function readKey(useLive) {
  if (useLive) {
    let raw;
    try {
      raw = readFileSync('.stripe-live', 'utf8');
    } catch {
      fail(
        'no .stripe-live file.\n' +
          '        Create it with one line:  STRIPE_SECRET_KEY=sk_live_...\n' +
          '        It is gitignored. Do NOT put a live key in .dev.vars.',
      );
    }
    const match = /^STRIPE_SECRET_KEY=(.*)$/m.exec(raw);
    if (!match) fail('.stripe-live has no STRIPE_SECRET_KEY line');
    const key = match[1].trim();
    if (!key.startsWith('sk_live_')) {
      fail('--live was passed but .stripe-live does not hold a live key (sk_live_...)');
    }
    return key;
  }

  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  try {
    const match = /^STRIPE_SECRET_KEY=(.*)$/m.exec(readFileSync('.dev.vars', 'utf8'));
    if (match) return match[1].trim();
  } catch {
    // No .dev.vars — fall through to the error below.
  }
  return null;
}

/* --------------------------------------------------------------- stripe */

const API = 'https://api.stripe.com/v1';

/** Stripe's API is form-encoded; this flattens the one level of nesting the
 *  calls below actually use. */
async function stripe(key, method, path, params = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    body.set(k, String(v));
  }
  const url = method === 'GET' ? `${API}${path}?${body}` : `${API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? body : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`Stripe returned something that was not JSON (${response.status})`);
  }
  if (!response.ok) fail(`Stripe: ${json?.error?.message ?? response.status}`);
  return json;
}

/* ----------------------------------------------------------------- main */

const args = parseArgs(process.argv.slice(2));

if (!args.to) fail('--to <email> is required');
if (!args.amount) fail('--amount <dollars> is required');
if (!args.for) fail('--for "<description>" is required');

const cents = toCents(args.amount);
if (cents === null) fail(`"${args.amount}" is not an amount. Use digits: 2500 or 2500.00`);
if (cents < 100) fail('amount is below $1.00');

const dueDays = Number(args.due);
if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) {
  fail('--due must be a whole number of days between 0 and 365');
}

const key = readKey(args.live);
if (!key) fail('no STRIPE_SECRET_KEY in the environment or .dev.vars');
if (!/^sk_(test|live)_/.test(key)) fail('STRIPE_SECRET_KEY does not look like a secret key');

const live = key.startsWith('sk_live_');
const dollars = (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

if (live && args.send && !args.yes) {
  fail(
    'refusing to send a LIVE invoice without --yes.\n' +
      `        This would email ${args.to} an invoice for ${dollars}.\n` +
      '        Re-run with --yes if that is exactly right.',
  );
}

console.log(`${live ? 'LIVE' : 'test'} mode · ${dollars} · ${args.to}`);

// Reuse an existing customer rather than making a second one with the same
// address — a client with two Customer objects has their history split across
// both, and Stripe will not merge them afterwards.
const found = await stripe(key, 'GET', '/customers', { email: args.to, limit: 1 });
let customer = found.data?.[0];
if (customer) {
  console.log(`customer      : ${customer.id} (existing)`);
} else {
  customer = await stripe(key, 'POST', '/customers', { email: args.to, name: args.name });
  console.log(`customer      : ${customer.id} (new)`);
}

// Order matters: the line item is attached to the customer FIRST, then the
// invoice sweeps up their pending items. Creating the invoice first leaves it
// empty and it finalizes at zero.
await stripe(key, 'POST', '/invoiceitems', {
  customer: customer.id,
  amount: cents,
  currency: 'usd',
  description: args.for,
});

const invoice = await stripe(key, 'POST', '/invoices', {
  customer: customer.id,
  // `send_invoice` is what makes this an invoice a person is asked to pay,
  // rather than `charge_automatically`, which would try a saved card.
  collection_method: 'send_invoice',
  days_until_due: dueDays,
  auto_advance: true,
});

// Finalizing is what assigns the invoice number and freezes the amounts. A
// draft has no payment URL to send anyone.
const finalized = await stripe(key, 'POST', `/invoices/${invoice.id}/finalize`);

console.log(`invoice       : ${finalized.number ?? finalized.id}`);
console.log(`due           : ${dueDays} days`);
console.log(`hosted page   : ${finalized.hosted_invoice_url ?? '(none)'}`);
console.log(`pdf           : ${finalized.invoice_pdf ?? '(none)'}`);

/*
 * Write the result to a file as well as the terminal.
 *
 * Live-mode Stripe writes cannot be made from an assistant session, so the
 * command above is run by a person. This file is how the result gets back
 * without anyone retyping a 300-character URL: run the command, then the
 * draft email can be composed straight from this. It is overwritten each
 * time — it is a scratch handoff, not a ledger. Stripe's dashboard is the
 * record of what was invoiced.
 *
 * Gitignored. The hosted URL is effectively a bearer link to a payment page,
 * so it does not belong in the repository.
 */
const LAST = '.invoice-last.json';
try {
  writeFileSync(
    LAST,
    JSON.stringify(
      {
        mode: live ? 'live' : 'test',
        number: finalized.number ?? finalized.id,
        id: finalized.id,
        to: args.to,
        name: args.name ?? '',
        description: args.for,
        amount: dollars,
        dueDays,
        hostedUrl: finalized.hosted_invoice_url ?? '',
        pdfUrl: finalized.invoice_pdf ?? '',
        sent: Boolean(args.send),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`saved         : ${LAST}`);
} catch {
  // Not being able to write the handoff file must never fail an invoice that
  // Stripe has already finalized. The terminal output above is the fallback.
}

if (!args.send) {
  console.log('');
  console.log('NOT SENT. This invoice is finalized but no email has gone out.');
  console.log('Send the hosted page link yourself, or re-run with --send to have');
  console.log(`Stripe email it. To cancel it: void it in the dashboard.`);
  process.exit(0);
}

await stripe(key, 'POST', `/invoices/${finalized.id}/send`);
console.log('');
console.log(`SENT to ${args.to}.`);
if (!live) {
  console.log('Test mode, so Stripe delivered no real email — the hosted page above is live though.');
}
