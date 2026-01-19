// functions/api/login.ts
export {};

type Env = {
  STRIPE_SECRET_KEY?: string;
};

const STRIPE_API = "https://api.stripe.com";

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(req: Request, body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req) },
  });
}

async function stripeGET(path: string, key: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `Stripe request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const onRequestOptions = async ({ request }: any) => {
  return new Response(null, { status: 204, headers: cors(request) });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const key = (env?.STRIPE_SECRET_KEY || "").trim();
  if (!key) return json(request, { ok: false, error: "Missing STRIPE_SECRET_KEY" }, 500);

  const body = (await request.json().catch(() => null)) as any;
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json(request, { ok: false, error: "Valid email required" }, 400);

  try {
    // 1) Find customer by email
    const customers = await stripeGET(
      `/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      key
    );

    const customer = customers?.data?.[0];
    if (!customer?.id) return json(request, { ok: true, access: "none" }, 200);

    const customerId = String(customer.id);

    // 2) Check active/trialing subscriptions
    const subs = await stripeGET(
      `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
      key
    );

    const hasSub = Array.isArray(subs?.data)
      ? subs.data.some((s: any) => s?.status === "active" || s?.status === "trialing")
      : false;

    // 3) Check paid one-time checkout sessions (lifetime)
    const sessions = await stripeGET(
      `/v1/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=100`,
      key
    );

    const hasLifetime = Array.isArray(sessions?.data)
      ? sessions.data.some((s: any) => s?.mode === "payment" && s?.payment_status === "paid")
      : false;

    const access = hasLifetime ? "lifetime" : hasSub ? "subscription" : "none";
    return json(request, { ok: true, access }, 200);
  } catch (e: any) {
    return json(request, { ok: false, error: e?.message || "Login check failed" }, 500);
  }
};
