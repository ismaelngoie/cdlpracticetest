// functions/api/login.ts
// Cloudflare Pages Function: POST /api/login
//
// Body: { email: string }
// Returns: { ok:true, access:"subscription"|"lifetime" } OR { ok:false, error?:string }
//
// Requires env:
// - STRIPE_SECRET_KEY
// Optional env:
// - STRIPE_PRICE_MONTHLY / STRIPE_PRICE_LIFETIME
// - STRIPE_LIFETIME_FALLBACK_ANY_PAYMENT="1"  (ONLY if you must support old payment links that lack price scoping)

import {
  StripeList,
  StripeCustomer,
  badRequest,
  findCustomerByEmail,
  getPriceIds,
  getStripeKey,
  json,
  normalizeEmail,
  stripeGET,
} from "../_stripe";

type StripeSubscriptionItem = { price?: { id?: string } };
type StripeSubscription = {
  id: string;
  status: string;
  items?: { data?: StripeSubscriptionItem[] };
};

type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | string;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  status?: "complete" | "open" | "expired" | string;
  metadata?: Record<string, string> | null;
};

type StripeLineItem = { price?: { id?: string } | null };
type StripeLineItems = { object: "list"; data: StripeLineItem[]; has_more: boolean };

function isActiveSubStatus(status: string) {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function hasActiveSubscription(customerId: string, stripeKey: string, monthlyPriceId: string) {
  const subs = await stripeGET<StripeList<StripeSubscription>>(
    `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=20`,
    stripeKey
  );

  if (!Array.isArray(subs?.data)) return false;

  // Prefer strict: active + contains our monthly price
  for (const s of subs.data) {
    if (!s?.id) continue;
    if (!isActiveSubStatus(String(s.status))) continue;

    const items = s.items?.data || [];
    const hasMonthly = Array.isArray(items)
      ? items.some((it) => String(it?.price?.id || "") === String(monthlyPriceId))
      : false;

    if (hasMonthly) return true;
  }

  // Fallback: any active subscription (if items not present)
  return subs.data.some((s) => isActiveSubStatus(String(s.status)));
}

async function sessionHasLifetimePrice(sessionId: string, stripeKey: string, lifetimePriceId: string) {
  const items = await stripeGET<StripeLineItems>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=100`,
    stripeKey
  );

  return (
    Array.isArray(items?.data) &&
    items.data.some((li) => String(li?.price?.id || "") === String(lifetimePriceId))
  );
}

async function hasPaidLifetimeSession(
  customerId: string,
  stripeKey: string,
  lifetimePriceId: string,
  allowAnyPaidFallback: boolean
) {
  // Look through recent sessions (few pages max)
  let startingAfter: string | null = null;

  for (let page = 0; page < 3; page++) {
    const base = `/v1/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=25`;
    const qs = startingAfter ? `${base}&starting_after=${encodeURIComponent(startingAfter)}` : base;

    const sessions = await stripeGET<StripeList<StripeCheckoutSession>>(qs, stripeKey);

    const candidates =
      Array.isArray(sessions?.data) &&
      sessions.data.filter(
        (s) => s.mode === "payment" && s.payment_status === "paid" && s.status === "complete"
      );

    if (candidates && candidates.length) {
      for (const s of candidates) {
        // Fast path: if we created it, metadata will be present
        const metaPlan = String(s?.metadata?.plan || "");
        const metaApp = String(s?.metadata?.app || "");
        if (metaApp === "cdl" && metaPlan === "lifetime") return true;

        // Strict: verify line_items include our lifetime price
        const ok = await sessionHasLifetimePrice(String(s.id), stripeKey, lifetimePriceId);
        if (ok) return true;

        // Legacy fallback (optional)
        if (allowAnyPaidFallback) return true;
      }
    }

    if (!sessions.has_more || !sessions.data?.length) break;
    startingAfter = sessions.data[sessions.data.length - 1].id;
  }

  return false;
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: Record<string, any>;
}) {
  try {
    const stripeKey = getStripeKey(env);
    if (!stripeKey) return json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, 500);

    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = normalizeEmail(body?.email);
    if (!email) return badRequest("Email required");

    const customer = await findCustomerByEmail(email, stripeKey);
    if (!customer?.id) {
      return json({ ok: false });
    }

    const { monthly, lifetime } = getPriceIds(env);

    // 1) Subscription check (strict by price id)
    const subOk = await hasActiveSubscription(customer.id, stripeKey, monthly);
    if (subOk) return json({ ok: true, access: "subscription" });

    // 2) Lifetime check (strict by price id; optional legacy fallback)
    const allowAnyPaidFallback = String(env.STRIPE_LIFETIME_FALLBACK_ANY_PAYMENT || "") === "1";
    const lifeOk = await hasPaidLifetimeSession(customer.id, stripeKey, lifetime, allowAnyPaidFallback);
    if (lifeOk) return json({ ok: true, access: "lifetime" });

    return json({ ok: false });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "Server error" }, 500);
  }
}
