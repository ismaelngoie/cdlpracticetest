// functions/api/login.ts
// Cloudflare Pages Function: POST /api/login

type StripeList<T> = { object: "list"; data: T[]; has_more: boolean };

type StripeCustomer = { id: string; email?: string | null };
type StripeSubscription = { id: string; status: string };
type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | string;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  status?: "complete" | "open" | "expired" | string;
};

async function stripeGET<T>(path: string, stripeKey: string): Promise<T> {
  const url = `https://api.stripe.com${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${stripeKey}` },
  });

  const json: any = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message || `Stripe error (${res.status})`;
    throw new Error(msg);
  }

  return json as T;
}

function isActiveSubStatus(status: string) {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function hasActiveSubscription(customerId: string, stripeKey: string) {
  const subs = await stripeGET<StripeList<StripeSubscription>>(
    `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=20`,
    stripeKey
  );

  return Array.isArray(subs.data) && subs.data.some((s) => isActiveSubStatus(String(s.status)));
}

async function hasPaidLifetimeSession(customerId: string, stripeKey: string) {
  // Any paid one-time checkout session counts as "lifetime"
  let startingAfter: string | null = null;

  for (let page = 0; page < 3; page++) {
    const base: string = `/v1/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=25`;
    const qs: string = startingAfter
      ? `${base}&starting_after=${encodeURIComponent(startingAfter)}`
      : base;

    const sessions = await stripeGET<StripeList<StripeCheckoutSession>>(qs, stripeKey);

    const found =
      Array.isArray(sessions.data) &&
      sessions.data.some((s) => s.mode === "payment" && s.payment_status === "paid" && s.status === "complete");

    if (found) return true;

    if (!sessions.has_more || !sessions.data?.length) break;
    startingAfter = sessions.data[sessions.data.length - 1].id;
  }

  return false;
}

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  try {
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ ok: false, error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 1) Find customer by email
    const customers = await stripeGET<StripeList<StripeCustomer>>(
      `/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      stripeKey
    );

    const customer = customers?.data?.[0];
    if (!customer?.id) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 2) Subscription check
    const subOk = await hasActiveSubscription(customer.id, stripeKey);
    if (subOk) {
      return new Response(JSON.stringify({ ok: true, access: "subscription" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 3) Lifetime check
    const lifeOk = await hasPaidLifetimeSession(customer.id, stripeKey);
    if (lifeOk) {
      return new Response(JSON.stringify({ ok: true, access: "lifetime" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    return new Response(JSON.stringify({ ok: false }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
