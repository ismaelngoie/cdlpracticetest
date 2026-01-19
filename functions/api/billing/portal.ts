// functions/api/billing/portal.ts
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
  STRIPE_PORTAL_CONFIGURATION_ID?: string; // optional
  ALLOWED_ORIGIN?: string;
};

const STRIPE_API = "https://api.stripe.com";

function corsHeaders(req: Request, env?: Env) {
  const origin = req.headers.get("Origin") || "";
  const allow = env?.ALLOWED_ORIGIN?.trim();

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
    headers: { Authorization: `Bearer ${key}` },
  });
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `Stripe GET failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

async function stripePOSTForm<T>(path: string, form: URLSearchParams, key: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `Stripe POST failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

type StripeList<T> = { object: "list"; data: T[] };
type StripeCustomer = { id: string; email?: string | null };
type StripePortalSession = { url?: string };

async function findCustomerByEmail(email: string, key: string): Promise<StripeCustomer | null> {
  const q = `/v1/customers?email=${encodeURIComponent(email)}&limit=1`;
  const list = await stripeGET<StripeList<StripeCustomer>>(q, key);
  return list?.data?.[0] || null;
}

function safeReturnUrl(req: Request, input: string | undefined) {
  // Allow only same-origin return URLs (prevents open redirect)
  try {
    const u = new URL(input || "", new URL(req.url).origin);
    const origin = new URL(req.url).origin;
    if (u.origin !== origin) return `${origin}/profile`;
    return u.toString();
  } catch {
    return `${new URL(req.url).origin}/profile`;
  }
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
  const returnUrl = safeReturnUrl(request, String(body?.returnUrl || ""));

  if (!email || !email.includes("@")) return json(request, env, { ok: false, error: "Valid email required" }, 400);

  try {
    const customer = await findCustomerByEmail(email, key);
    if (!customer) return json(request, env, { ok: false, error: "No Stripe customer found for that email." }, 404);

    const form = new URLSearchParams();
    form.set("customer", customer.id);
    form.set("return_url", returnUrl);

    const cfg = (env?.STRIPE_PORTAL_CONFIGURATION_ID || "").trim();
    if (cfg) form.set("configuration", cfg);

    const session = await stripePOSTForm<StripePortalSession>("/v1/billing_portal/sessions", form, key);

    if (!session?.url) return json(request, env, { ok: false, error: "Stripe portal URL missing." }, 500);
    return json(request, env, { ok: true, url: session.url }, 200);
  } catch (e: any) {
    return json(request, env, { ok: false, error: e?.message || "Could not create billing portal session." }, 500);
  }
};
