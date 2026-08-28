/**
 * One-time Stripe account setup that the payment routes depend on.
 *
 *   node scripts/stripe-setup.mjs           (test mode, from .dev.vars)
 *   node scripts/stripe-setup.mjs --live    (live mode, from .stripe-live)
 *
 * Everything here is idempotent: run it twice and the second run reports
 * "already configured" rather than making a duplicate.
 *
 * What it sets, and why each one is not optional:
 *
 *   1. THE CUSTOMER PORTAL. `app/api/portal/route.server.ts` opens it so a
 *      retainer client can cancel without emailing anyone, and `content/pay.ts`
 *      promises exactly that in writing ("you can cancel it yourself at any
 *      time"). With no portal configuration on the account, that route fails
 *      with a plain API error and the promise is a lie. This is the whole
 *      reason the script exists.
 *
 *   2. A SUPPORT EMAIL. Stripe prints it on receipts and invoices as the
 *      address to contact about a charge. Unset, a client who wants to query
 *      a payment has nothing to write to except the bank — which is how a
 *      question becomes a chargeback.
 *
 * Not handled here: branding (logo and colour for Checkout and invoices),
 * which needs a file upload and is a dashboard job.
 */
import { readFileSync } from 'node:fs';

const live = process.argv.includes('--live');

function fail(message) {
  console.error(`stripe-setup: ${message}`);
  process.exit(1);
}

function readKey() {
  const file = live ? '.stripe-live' : '.dev.vars';
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    fail(`no ${file} file`);
  }
  const match = /^STRIPE_SECRET_KEY=(.*)$/m.exec(raw);
  if (!match) fail(`${file} has no STRIPE_SECRET_KEY line`);
  const key = match[1].trim();
  if (live && !key.startsWith('sk_live_')) fail('--live was passed but .stripe-live is not a live key');
  return key;
}

const KEY = readKey();
const API = 'https://api.stripe.com/v1';

async function stripe(method, path, params) {
  const body = new URLSearchParams();
  const walk = (prefix, value) => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
    if (value && typeof value === 'object') {
      return Object.entries(value).forEach(([k, v]) => walk(`${prefix}[${k}]`, v));
    }
    body.set(prefix, String(value));
  };
  for (const [k, v] of Object.entries(params ?? {})) walk(k, v);

  const response = await fetch(method === 'GET' ? `${API}${path}?${body}` : `${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? body : undefined,
  });
  const json = await response.json();
  if (!response.ok) {
    const err = new Error(json?.error?.message ?? `HTTP ${response.status}`);
    err.stripeMessage = json?.error?.message ?? '';
    throw err;
  }
  return json;
}

const RETURN_URL = 'https://codycantrell.dev/pay';

console.log(`${live ? 'LIVE' : 'test'} mode`);

/* ------------------------------------------------------- 1. the portal */

let portalOk = false;
try {
  const existing = await stripe('GET', '/billing_portal/configurations', { limit: 10 });
  const active = (existing.data ?? []).filter((c) => c.active);

  if (active.length) {
    console.log(`portal        : already configured (${active[0].id})`);
    portalOk = true;
  } else {
    const created = await stripe('POST', '/billing_portal/configurations', {
      business_profile: { headline: 'Cody Cantrell — manage your retainer' },
      default_return_url: RETURN_URL,
      features: {
        // The one that matters: cancelling without having to ask.
        subscription_cancel: {
          enabled: true,
          // At period end, not immediately — they have paid for this month.
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        // A card that expired should not need an email to me to replace.
        payment_method_update: { enabled: true },
        // Their own receipts, without asking for copies.
        invoice_history: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ['email', 'address', 'name'] },
      },
    });
    console.log(`portal        : created ${created.id}`);
    portalOk = true;
  }
} catch (error) {
  console.log(`portal        : FAILED — ${error.message}`);
  // The usual live-mode cause: Stripe requires public terms and privacy URLs
  // before it will host a portal on your behalf.
  if (/terms|privacy/i.test(error.stripeMessage ?? '')) {
    console.log('                Stripe wants public terms-of-service and privacy-policy');
    console.log('                URLs before it will host the portal. Those pages do not');
    console.log('                exist on the site yet.');
  }
}

/* ------------------------------------------- 2. the support email on receipts */

try {
  const account = await stripe('GET', '/account');
  const current = account.business_profile?.support_email;
  if (current) {
    console.log(`support email : already set (${current})`);
  } else {
    await stripe('POST', '/account', {
      business_profile: { support_email: 'cantrellco.13@gmail.com' },
    });
    console.log('support email : set to cantrellco.13@gmail.com');
  }
} catch (error) {
  console.log(`support email : could not set — ${error.message}`);
  console.log('                Set it in the dashboard: Settings > Business details.');
}

console.log('');
console.log(portalOk ? 'Retainer clients can now cancel themselves.' : 'PORTAL NOT SET UP — /api/portal will fail for subscribers.');
