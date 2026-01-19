// functions/api/checkout.ts
// POST /api/checkout
//
// Body: { plan: "monthly"|"lifetime", email?: string }
// Returns: { ok:true, url:string, sessionId:string } OR { ok:false, error:string }
//
// Requires env:
// - STRIPE_SECRET_KEY
// Optional env:
// - APP_URL (e.g., https://cdlpretest.com)
// - STRIPE_PRICE_MONTHLY
// - STRIPE_PRICE_LIFETIME
// - STRIPE_AUTOMATIC_TAX="1" (only if configured in Stripe)

import {
  badRequest,
  getAppOrigin,
  getPriceIds,
  getStripeKey,
  json,
  normalizeEmail,
  stripePOSTForm,
} from "../_stripe";

type StripeCheckoutSession = { id: string; url?: string | null };

function planFrom(input: any): "monthly" | "lifetime" | "" {
  const p = String(input || "").trim().toLowerCase();
  if (p === "monthly" || p === "lifetime") return p;
  return "";
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

    const body = (await request.json().catch(() => null)) as
      | { plan?: string; email?: string }
      | null;

    const plan = planFrom(body?.plan);
    if (!plan) return badRequest("Invalid plan. Use monthly or lifetime.");

    const email = normalizeEmail(body?.email || "");
    const { monthly, lifetime } = getPriceIds(env);

    const origin = getAppOrigin(request, env);
    if (!origin) return json({ ok: false, error: "Missing APP_URL / origin" }, 500);

    const successUrl = `${origin}/dashboard?plan=${encodeURIComponent(
      plan
    )}&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = `${origin}/pay?plan=${encodeURIComponent(plan)}&canceled=1`;

    const automaticTaxEnabled = String(env.STRIPE_AUTOMATIC_TAX || "").trim() === "1";

    const common: Record<string, string> = {
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: "true",
      // lightweight “product scoping” metadata
      "metadata[app]": "cdl",
      "metadata[plan]": plan,
    };

    // Idempotency (prevents accidental double-checkout on double-click)
    const idem =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : String(Date.now());

    let form: Record<string, string> = {};

    if (plan === "monthly") {
      form = {
        ...common,
        mode: "subscription",
        "line_items[0][price]": monthly,
        "line_items[0][quantity]": "1",
        ...(email ? { customer_email: email } : {}),
        // Duplicate metadata inside subscription for easier auditing
        "subscription_data[metadata][app]": "cdl",
        "subscription_data[metadata][plan]": "monthly",
      };

      if (automaticTaxEnabled) {
        form["automatic_tax[enabled]"] = "true";
      }
    } else {
      // lifetime
      form = {
        ...common,
        mode: "payment",
        "line_items[0][price]": lifetime,
        "line_items[0][quantity]": "1",
        ...(email ? { customer_email: email } : {}),
        "payment_intent_data[metadata][app]": "cdl",
        "payment_intent_data[metadata][plan]": "lifetime",
      };

      if (automaticTaxEnabled) {
        form["automatic_tax[enabled]"] = "true";
      }
    }

    const session = await stripePOSTForm<StripeCheckoutSession>(
      "/v1/checkout/sessions",
      stripeKey,
      form,
      idem
    );

    if (!session?.id || !session?.url) {
      return json({ ok: false, error: "Stripe session URL missing" }, 500);
    }

    return json({ ok: true, url: session.url, sessionId: session.id });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "Server error" }, 500);
  }
}
