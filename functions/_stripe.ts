// functions/_stripe.ts
// Shared Stripe + response helpers for Cloudflare Pages Functions (Workers runtime).

export type StripeList<T> = { object: "list"; data: T[]; has_more: boolean };

export type StripeCustomer = { id: string; email?: string | null };

type StripeErrorShape = { error?: { message?: string } };

function headers(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...(extra || {}),
  };
}

export function json(data: any, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: headers(extraHeaders) });
}

export function badRequest(message: string) {
  return json({ ok: false, error: message }, 400);
}

export function notFound(message: string) {
  return json({ ok: false, error: message }, 404);
}

export function serverError(message: string) {
  return json({ ok: false, error: message }, 500);
}

export function getStripeKey(env: Record<string, any>) {
  const k = String(env.STRIPE_SECRET_KEY || "").trim();
  return k || null;
}

export function getAppOrigin(request: Request, env: Record<string, any>) {
  const envUrl = String(env.APP_URL || "").trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  // Fallback: try host header
  const host = request.headers.get("host");
  if (host) return `https://${host}`.replace(/\/+$/, "");

  return "";
}

export function safeReturnUrl(input: string, fallback: string) {
  const url = String(input || "").trim();
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return fallback;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function stripeFetch<T>(
  path: string,
  stripeKey: string,
  init: RequestInit,
  idempotencyKey?: string
): Promise<T> {
  const url = `https://api.stripe.com${path}`;

  // light retries for transient errors / 429
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        ...(init.headers || {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });

    const jsonBody: any = await res.json().catch(() => null);

    if (res.ok) return jsonBody as T;

    const errMsg =
      (jsonBody as StripeErrorShape)?.error?.message || `Stripe error (${res.status})`;

    // Retry on 429 and 5xx
    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      const backoff = 250 * attempt * attempt;
      await sleep(backoff);
      continue;
    }

    throw new Error(errMsg);
  }

  throw new Error("Stripe request failed.");
}

export async function stripeGET<T>(path: string, stripeKey: string): Promise<T> {
  return stripeFetch<T>(path, stripeKey, { method: "GET" });
}

export async function stripePOSTForm<T>(
  path: string,
  stripeKey: string,
  form: Record<string, string>,
  idempotencyKey?: string
): Promise<T> {
  const body = new URLSearchParams(form);
  return stripeFetch<T>(
    path,
    stripeKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
    idempotencyKey
  );
}

export async function findCustomerByEmail(email: string, stripeKey: string) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return null;

  const customers = await stripeGET<StripeList<StripeCustomer>>(
    `/v1/customers?email=${encodeURIComponent(e)}&limit=1`,
    stripeKey
  );

  const customer = customers?.data?.[0];
  return customer?.id ? customer : null;
}

export function normalizeEmail(email: any) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return "";
  return e;
}

export function getPriceIds(env: Record<string, any>) {
  // Your provided defaults (can override with env vars)
  const monthly =
    String(env.STRIPE_PRICE_MONTHLY || "price_1Sr3m7J1pnlNpGwV7Zz2TQvU").trim();
  const lifetime =
    String(env.STRIPE_PRICE_LIFETIME || "price_1Sr3m7J1pnlNpGwVHmJtC7ob").trim();

  return { monthly, lifetime };
}
