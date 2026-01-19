// functions/api/confirm-checkout.ts
// POST /api/confirm-checkout
//
// Body: { sessionId: string }
// Returns: { ok:true, access:"subscription"|"lifetime", email?:string } OR { ok:false, error?:string }
//
// Requires env:
// - STRIPE_SECRET_KEY
// Optional env:
// - STRIPE_PRICE_MONTHLY / STRIPE_PRICE_LIFETIME

import { badRequest, getPriceIds, getStripeKey, json, stripeGET } from "../_stripe";

type StripeCheckoutSession = {
  id: string;
  mode?: "payment" | "subscription" | string;
  status?: "complete" | "open" | "expired" | string;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  customer?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
};

type StripeLineItem = { price?: { id?: string } | null };
type StripeLineItems = { object: "list"; data: StripeLineItem[]; has_more: boolean };

function normalizeSessionId(s: any) {
  const v = String(s || "").trim();
  // Stripe session ids start with "cs_"
  if (!v || !v.startsWith("cs_")) return "";
  return v;
}

function getEmailFromSession(sess: StripeCheckoutSession) {
  return (
    String(sess?.customer_details?.email || "").trim().toLowerCase() ||
    String(sess?.customer_email || "").trim().toLowerCase() ||
    ""
  );
}

function isComplete(sess: StripeCheckoutSession) {
  // Primary: status === "complete"
  if (String(sess?.status) !== "complete") return false;

  // For subscription, payment_status can be "paid" or "no_payment_required"
  const ps = String(sess?.payment_status || "");
  if (ps === "paid" || ps === "no_payment_required") return true;

  // Some Stripe configs may omit payment_status detail; still accept if complete
  return true;
}

async function sessionHasPrice(
  sessionId: string,
  stripeKey: string,
  priceId: string
): Promise<boolean> {
  const items = await stripeGET<StripeLineItems>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=100`,
    stripeKey
  );

  return (
    Array.isArray(items?.data) &&
    items.data.some((li) => String(li?.price?.id || "") === String(priceId))
  );
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

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    const sessionId = normalizeSessionId(body?.sessionId);
    if (!sessionId) return badRequest("Missing or invalid sessionId.");

    const sess = await stripeGET<StripeCheckoutSession>(
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      stripeKey
    );

    if (!isComplete(sess)) {
      return json({ ok: false, error: "Checkout not complete." }, 400);
    }

    const { monthly, lifetime } = getPriceIds(env);

    const mode = String(sess?.mode || "");
    if (mode !== "subscription" && mode !== "payment") {
      return json({ ok: false, error: "Unsupported checkout mode." }, 400);
    }

    // Verify product scope by price id (prevents unrelated Stripe sessions from unlocking)
    if (mode === "subscription") {
      const ok = await sessionHasPrice(sessionId, stripeKey, monthly);
      if (!ok) return json({ ok: false, error: "Price mismatch (subscription)." }, 400);
      const email = getEmailFromSession(sess);
      return json({ ok: true, access: "subscription", email });
    }

    // lifetime payment
    const ok = await sessionHasPrice(sessionId, stripeKey, lifetime);
    if (!ok) return json({ ok: false, error: "Price mismatch (lifetime)." }, 400);
    const email = getEmailFromSession(sess);
    return json({ ok: true, access: "lifetime", email });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "Server error" }, 500);
  }
}
