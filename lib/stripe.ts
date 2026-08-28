/**
 * The whole Stripe client: three requests and a signature check, over
 * `fetch`.
 *
 * No `stripe` package. That is the same call this project already makes
 * about three.js in `components/field/renderer.ts` — the SDK is a large
 * dependency built around a Node HTTP agent, and what this site actually
 * needs from Stripe is two POSTs, one GET, and an HMAC. Talking to the REST
 * API directly is a hundred lines, has no install to keep current, and runs
 * on the Workers runtime without a compatibility shim. If this ever grows
 * into real billing logic — proration, usage records, tax — that trade flips
 * and the SDK is the right answer; it is not that today.
 *
 * Everything here is server-only. Nothing in this file may ever be imported
 * by a client component: it reads the secret key.
 */

/**
 * The two secrets, both set with `wrangler secret put` and neither ever
 * committed. Declared here as optional because they genuinely are — a plain
 * `next build`, the e2e suite, and CI all run with no Cloudflare context at
 * all, and the payment routes have to degrade to a stated error rather than
 * crash the build. See `readStripeConfig` below.
 */
declare global {
  interface CloudflareEnv {
    /** Live or test secret key: `sk_live_...` / `sk_test_...`. */
    STRIPE_SECRET_KEY?: string;
    /** The signing secret for ONE webhook endpoint: `whsec_...`. */
    STRIPE_WEBHOOK_SECRET?: string;
  }
}

const STRIPE_API = 'https://api.stripe.com/v1';

/** How far out of date a webhook timestamp may be before the event is
 *  refused. Stripe's own libraries default to five minutes, and the number
 *  is what makes the signature check a replay guard rather than just a
 *  forgery guard: without it, a valid payload captured once stays valid
 *  forever. */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string | undefined;
};

/**
 * Read the secrets from wherever this happens to be running.
 *
 * Cloudflare first (production, `wrangler preview`, and `next dev` via
 * `initOpenNextCloudflareForDev`, which reads `.dev.vars`), then
 * `process.env` so a plain Node build or a test runner can supply them too.
 *
 * Returns null instead of throwing when there is no key. Every caller turns
 * that into the `config` error the payment page already has copy for, which
 * is why a repository clone with no Stripe account attached still builds,
 * still lints, still passes e2e, and shows a payment page that honestly says
 * it is not switched on.
 */
async function readSecrets(): Promise<{ secretKey?: string; webhookSecret?: string }> {
  let secretKey: string | undefined;
  let webhookSecret: string | undefined;

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    secretKey = env.STRIPE_SECRET_KEY;
    webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  } catch {
    // No Cloudflare context — plain node builds, test runners. Fall through
    // to process.env rather than treating this as a failure.
  }

  secretKey ??= process.env.STRIPE_SECRET_KEY;
  webhookSecret ??= process.env.STRIPE_WEBHOOK_SECRET;

  return { secretKey, webhookSecret };
}

export async function readStripeConfig(): Promise<StripeConfig | null> {
  const { secretKey, webhookSecret } = await readSecrets();
  if (!secretKey) return null;
  return { secretKey, webhookSecret };
}

/**
 * The webhook signing secret on its own.
 *
 * Separate from `readStripeConfig` because the webhook endpoint needs ONLY
 * this. It verifies a signature and reads a JSON body; it never calls the
 * Stripe API, so it has no use for the secret key. Bundling the two meant a
 * missing or mistyped `STRIPE_SECRET_KEY` silently took the webhook down as
 * well — refusing events it was perfectly capable of verifying, and doing it
 * with a 503 that Stripe would keep retrying against.
 */
export async function readWebhookSecret(): Promise<string | undefined> {
  const { webhookSecret } = await readSecrets();
  return webhookSecret;
}

/**
 * A value that can be sent to Stripe. Its form-encoding is nested — arrays
 * and objects become bracketed keys — so the input type is recursive too.
 */
export type FormValue = string | number | boolean | FormValue[] | { [key: string]: FormValue };

/**
 * Flatten a nested object into Stripe's bracket notation.
 *
 *   { line_items: [{ quantity: 1 }] }  ->  line_items[0][quantity]=1
 *
 * Stripe's API is `application/x-www-form-urlencoded` only — it does not
 * accept JSON bodies — and this is the encoding it expects. `URLSearchParams`
 * does the percent-escaping; this function only builds the key names.
 */
export function encodeForm(params: Record<string, FormValue>): URLSearchParams {
  const body = new URLSearchParams();

  const walk = (prefix: string, value: FormValue): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(`${prefix}[${index}]`, item));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        walk(`${prefix}[${key}]`, inner);
      }
      return;
    }
    body.set(prefix, String(value));
  };

  for (const [key, value] of Object.entries(params)) walk(key, value);
  return body;
}

/** Thrown for any non-2xx from Stripe, carrying whatever Stripe said about
 *  it. The message is for the server log only — the reader gets the fixed
 *  copy in `content/pay.ts`, because Stripe's own error strings are written
 *  for developers and occasionally mention internals. */
export class StripeError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'StripeError';
    this.status = status;
  }
}

async function request<T>(
  config: StripeConfig,
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, FormValue>,
  idempotencyKey?: string,
): Promise<T> {
  const body = encodeForm(params);
  const url = method === 'GET' ? `${STRIPE_API}${path}?${body.toString()}` : `${STRIPE_API}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secretKey}`,
  };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  // Guards a retried request — a dropped connection, a Workers retry — from
  // creating a second session. It does NOT deduplicate a reader clicking
  // submit twice: that is a second request with a second key, and it is
  // harmless, because an unpaid Checkout Session costs nothing and only one
  // of them can be completed.
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let detail = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // Not JSON — an edge error page, say. The raw text is the best detail
      // available, and it is already truncated above.
    }
    throw new StripeError(response.status, detail);
  }

  return JSON.parse(text) as T;
}

export function stripePost<T>(
  config: StripeConfig,
  path: string,
  params: Record<string, FormValue>,
  idempotencyKey?: string,
): Promise<T> {
  return request<T>(config, 'POST', path, params, idempotencyKey);
}

export function stripeGet<T>(
  config: StripeConfig,
  path: string,
  params: Record<string, FormValue> = {},
): Promise<T> {
  return request<T>(config, 'GET', path, params);
}

/**
 * The slice of a Checkout Session this site reads.
 *
 * Deliberately partial, and every field optional that Stripe does not
 * guarantee on every session. These particular fields have been stable
 * across many API versions, which is what makes it safe for this client not
 * to pin one — see the note in README.
 */
export type CheckoutSession = {
  id: string;
  /** `open` | `complete` | `expired`. */
  status?: string;
  /** `paid` | `unpaid` | `no_payment_required`. */
  payment_status?: string;
  mode?: string;
  amount_total?: number | null;
  currency?: string | null;
  /** String when not expanded, object when it is, null on sessions that
   *  never created one. */
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

/** Stripe returns an id-or-object for every expandable field. This is the
 *  one-line narrowing that saves every call site from repeating it. */
export function idOf(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
}

/* -------------------------------------------------------------- webhooks */

/** Hex string to bytes. Returns null for anything that is not clean hex, so
 *  a malformed header is a rejected signature rather than a thrown error. */
function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Verify a `Stripe-Signature` header against the raw request body.
 *
 * This is the only thing standing between the webhook endpoint and the open
 * internet. The endpoint's URL is not a secret — anyone can POST to it — so
 * an unverified webhook handler is a stranger with write access to whatever
 * it touches.
 *
 * Two things are checked, and both matter:
 *
 *  1. The HMAC. Computed over `${timestamp}.${rawBody}` exactly as Stripe
 *     signed it, which is why the caller must pass the raw text and never a
 *     re-serialised object — `JSON.parse` followed by `JSON.stringify` can
 *     reorder keys and change whitespace, and either one breaks the digest.
 *  2. The timestamp. Without the freshness window a genuine payload captured
 *     off the wire once could be replayed indefinitely.
 *
 * The comparison itself is `crypto.subtle.verify` rather than a string
 * `===`, so it does not leak the correct digest through how long it takes to
 * reject a wrong one.
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!signatureHeader) return false;

  // `t=1234,v1=abc,v1=def` — more than one v1 during a secret rotation.
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of signatureHeader.split(',')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === 't') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signedPayload = encoder.encode(`${timestamp}.${rawBody}`);

  for (const signature of signatures) {
    const bytes = hexToBytes(signature);
    if (!bytes) continue;
    // Uint8Array over a plain ArrayBuffer: `subtle.verify` wants a BufferSource,
    // and slicing the exact bytes avoids handing it a larger backing buffer.
    const ok = await crypto.subtle.verify('HMAC', key, bytes as BufferSource, signedPayload);
    if (ok) return true;
  }

  return false;
}
