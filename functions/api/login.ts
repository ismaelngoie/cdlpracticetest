// functions/api/login.ts
export {};

type PagesContext<Env = unknown> = {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil: (p: Promise<any>) => void;
  next: () => Promise<Response>;
  data: Record<string, any>;
};

type PagesFunction<Env = unknown> = (ctx: PagesContext<Env>) => Response | Promise<Response>;

type Env = {
  STRIPE_SECRET_KEY?: string;
  ALLOWED_ORIGIN?: string;
};

const STRIPE_API = "https://api.stripe.com";

function corsHeaders(req: Request, env?: Env) {
  const origin = req.headers.get("Origin") || "";
  const allow = env?.ALLOWED_ORIGIN?.trim();

  // If ALLOWED_ORIGIN is set, only echo it when matched; otherwise allow same-origin + local dev.
  const ok =
    !allow ||
    origin === allow ||
    origin.endsWith(".pages.dev") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1");

  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : (allow || "*"),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(req: Request, env: Env | undefined, body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(req, env),
    },
  });
}

async function stripeGET<T>(pathWithQuery: string, key: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${pathWithQuery}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `Stripe GET failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

type StripeList<T> = { object: "list"; data: T[]; has_more: boolean };
type StripeCustomer = { id: string; email?: string | null };
type StripeSubscription = { id: string; status: string };
type StripeCheckoutSession = { id: string; mode?: string; payment_status?: string };

async function findCustomerByEmail(email: string, key: string): Promise<StripeCustomer | null> {
  const q = `/v1/customers?email=${encodeURIComponent(email)}&limit=1`;
  const list = await stripeGET<StripeList<StripeCustomer>>(q, key);
  return list?.data?.[0] || null;
}

async function hasActiveSubscription(customerId: string, key: string): Promise<boolean> {
  const q = `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=25`;
  const list = await stripeGET<StripeList<StripeSubscription>>(q, key);
  const subs = list?.data || [];
  return subs.some((s) => s.status === "active" || s.status === "trialing");
}

async function hasPaidOneTimeCheckout(customerId: string, key: string): Promise<boolean> {
  // Treat any PAID "payment" Checkout Session as lifetime.
  let startingAfter: string | null = null;

  for (let page = 0; page < 3; page++) {
    const base = `/v1/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=25`;
    const url = startingAfter
      ? `${base}&starting_after=${encodeURIComponent(startingAfter)}`
      : base;

    const list = await stripeGET<StripeList<StripeCheckoutSession>>(url, key);
    const sessions = list?.data || [];

    if (sessions.some((s) => s.mode === "payment" && s.payment_status === "paid")) return true;

    if (!list?.has_more || sessions.length === 0) break;
    startingAfter = sessions[sessions.length - 1].id;
  }

  return false;
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) => {
  return new Response(null, { status: 204, headers: corsHeaders(ctx.request, ctx.env) });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  const key = (env?.STRIPE_SECRET_KEY || "").trim();
  if (!key) return json(request, env, { ok: false, error: "Missing STRIPE_SECRET_KEY" }, 500);

  const body = await request.json().catch(() => null) as any;
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json(request, env, { ok: false, error: "Valid email required" }, 400);

  try {
    const customer = await findCustomerByEmail(email, key);
    if (!customer) return json(request, env, { ok: true, access: "none" }, 200);

    const [sub, life] = await Promise.all([
      hasActiveSubscription(customer.id, key),
      hasPaidOneTimeCheckout(customer.id, key),
    ]);

    const access = life ? "lifetime" : sub ? "subscription" : "none";
    return json(request, env, { ok: true, access }, 200);
  } catch (e: any) {
    return json(request, env, { ok: false, error: e?.message || "Login check failed" }, 500);
  }
};
