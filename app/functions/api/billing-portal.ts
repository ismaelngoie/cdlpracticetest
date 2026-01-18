// functions/api/billing-portal.ts
// Cloudflare Pages Function: POST /api/billing-portal
//
// Creates a Stripe Customer Portal session URL so users can:
// - cancel / pause subscription
// - update payment method
// - view invoices

type StripeList<T> = { object: "list"; data: T[]; has_more: boolean };
type StripeCustomer = { id: string; email?: string | null };
type StripePortalSession = { url: string };

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

async function stripePOSTForm<T>(path: string, stripeKey: string, form: Record<string, string>): Promise<T> {
  const url = `https://api.stripe.com${path}`;
  const body = new URLSearchParams(form);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json: any = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Stripe error (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
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

    const body = (await request.json().catch(() => null)) as { email?: string; returnUrl?: string } | null;
    const email = String(body?.email || "").trim().toLowerCase();
    const returnUrl = String(body?.returnUrl || "").trim();

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
      return new Response(JSON.stringify({ ok: false, error: "Customer not found for that email." }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 2) Create portal session
    const safeReturn = returnUrl && (returnUrl.startsWith("http://") || returnUrl.startsWith("https://"))
      ? returnUrl
      : env.STRIPE_PORTAL_RETURN_URL || "https://nremts.com/profile";

    const session = await stripePOSTForm<StripePortalSession>("/v1/billing_portal/sessions", stripeKey, {
      customer: customer.id,
      return_url: safeReturn,
    });

    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
