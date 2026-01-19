// functions/api/login.ts
export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_API_VERSION?: string; // optional
  LIFETIME_PRICE_ID?: string;  // optional (only if you use it)
}

type AccessState = "subscription" | "lifetime" | "none";

type StripeError = { error?: { message?: string } };

type StripeList<T> = {
  object: "list";
  data: T[];
  has_more: boolean;
};

type StripeCustomer = {
  id: string;
  email: string | null;
};

type StripeSubscription = {
  id: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
};

type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | string;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  status?: "open" | "complete" | "expired" | string;
  metadata?: Record<string, string>;
  created?: number;
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  stripeKey: string,
  apiVersion?: string,
  body?: Record<string, string>
): Promise<T> {
  const url = `https://api.stripe.com${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeKey}`,
  };
  if (apiVersion) headers["Stripe-Version"] = apiVersion;

  const init: RequestInit = { method, headers };

  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(body ?? {}).toString();
  }

  const res = await fetch(url, init);
  const parsed = (await res.json().catch(() => null)) as (T & StripeError) | null;

  if (!res.ok) {
    const msg = (parsed as StripeError | null)?.error?.message || `Stripe error (${res.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}

async function stripeGET<T>(path: string, stripeKey: string, apiVersion?: string) {
  return stripeRequest<T>("GET", path, stripeKey, apiVersion);
}

function isValidEmail(e: string) {
  return typeof e === "string" && e.includes("@") && e.length <= 254;
}

async function findCustomerIdByEmail(email: string, stripeKey: string, apiVersion?: string): Promise<string | null> {
  // Stripe supports filtering customers by email
  const list = await stripeGET<StripeList<StripeCustomer>>(
    `/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
    stripeKey,
    apiVersion
  );
  return list.data?.[0]?.id ?? null;
}

async function hasActiveSubscription(customerId: string, stripeKey: string, apiVersion?: string): Promise<boolean> {
  const subs = await stripeGET<StripeList<StripeSubscription>>(
    `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=20`,
    stripeKey,
    apiVersion
  );

  return subs.data.some((s) => s.status === "active" || s.status === "trialing");
}

async function hasLifetimePurchase(
  customerId: string,
  stripeKey: string,
  apiVersion?: string,
  lifetimePriceId?: string
): Promise<boolean> {
  // We scan recent checkout sessions. For reliability, set metadata on your lifetime checkout:
  // metadata: { access: "lifetime" } OR { plan: "lifetime" } OR { price_id: "<LIFETIME_PRICE_ID>" }
  let startingAfter: string | null = null;

  for (let page = 0; page < 3; page++) {
    const base: string = `/v1/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=25`;
    const urlPath: string = startingAfter
      ? `${base}&starting_after=${encodeURIComponent(startingAfter)}`
      : base;

    const sessions = await stripeGET<StripeList<StripeCheckoutSession>>(urlPath, stripeKey, apiVersion);

    for (const s of sessions.data) {
      const paid = s.payment_status === "paid" || s.status === "complete";
      const meta = s.metadata || {};

      const flaggedLifetime =
        meta.access === "lifetime" ||
        meta.plan === "lifetime" ||
        (lifetimePriceId && meta.price_id === lifetimePriceId);

      if (paid && s.mode === "payment" && flaggedLifetime) return true;
    }

    if (!sessions.has_more || sessions.data.length === 0) break;
    startingAfter = sessions.data[sessions.data.length - 1]?.id ?? null;
    if (!startingAfter) break;
  }

  return false;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: cors() });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const { STRIPE_SECRET_KEY, STRIPE_API_VERSION, LIFETIME_PRICE_ID } = ctx.env;

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500,
        headers: { ...cors(), "Content-Type": "application/json" },
      });
    }

    const body = (await ctx.request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ ok: true, access: "none" satisfies AccessState }), {
        status: 200,
        headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const customerId = await findCustomerIdByEmail(email, STRIPE_SECRET_KEY, STRIPE_API_VERSION);
    if (!customerId) {
      return new Response(JSON.stringify({ ok: true, access: "none" satisfies AccessState }), {
        status: 200,
        headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 1) subscription wins
    if (await hasActiveSubscription(customerId, STRIPE_SECRET_KEY, STRIPE_API_VERSION)) {
      return new Response(JSON.stringify({ ok: true, access: "subscription" satisfies AccessState }), {
        status: 200,
        headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 2) lifetime fallback
    if (await hasLifetimePurchase(customerId, STRIPE_SECRET_KEY, STRIPE_API_VERSION, LIFETIME_PRICE_ID)) {
      return new Response(JSON.stringify({ ok: true, access: "lifetime" satisfies AccessState }), {
        status: 200,
        headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    return new Response(JSON.stringify({ ok: true, access: "none" satisfies AccessState }), {
      status: 200,
      headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...cors(), "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};
