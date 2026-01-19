// functions/api/billing-portal.ts
// POST /api/billing-portal
//
// Body: { email: string, returnUrl?: string }
// Returns: { ok:true, url:string } OR { ok:false, error:string }

import {
  badRequest,
  findCustomerByEmail,
  getAppOrigin,
  getStripeKey,
  json,
  normalizeEmail,
  safeReturnUrl,
  stripePOSTForm,
} from "../_stripe";

type StripePortalSession = { url: string };

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

    const body = (await request.json().catch(() => null)) as { email?: string; returnUrl?: string } | null;
    const email = normalizeEmail(body?.email);
    if (!email) return badRequest("Email required");

    const customer = await findCustomerByEmail(email, stripeKey);
    if (!customer?.id) return json({ ok: false, error: "Customer not found for that email." }, 404);

    const origin = getAppOrigin(request, env);
    const fallbackReturn = origin ? `${origin}/profile` : "/profile";
    const returnUrl = safeReturnUrl(String(body?.returnUrl || ""), fallbackReturn);

    const session = await stripePOSTForm<StripePortalSession>("/v1/billing_portal/sessions", stripeKey, {
      customer: customer.id,
      return_url: returnUrl,
    });

    if (!session?.url) return json({ ok: false, error: "Stripe portal URL missing" }, 500);

    return json({ ok: true, url: session.url });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "Server error" }, 500);
  }
}
