// functions/api/checkout.ts
export {};

type Env = {
  STRIPE_SECRET_KEY?: string;
};

const STRIPE_API = "https://api.stripe.com";

// ✅ Put your real Price IDs here (since you removed env vars)
const STRIPE_PRICE_MONTHLY = "price_1Sr3m7J1pnlNpGwV7Zz2TQvU";
const STRIPE_PRICE_LIFETIME = "price_1Sr3m7J1pnlNpGwVHmJtC7ob";

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function badRequest(message: string) {
  return json({ ok: false, error: message }, 400);
}

function getOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = request.headers.get("host");
  if (host) return `https://${host}`.replace(/\/+$/, "");
  return "";
}

function normalizeEmail(email: any) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function planFrom(input: any): "monthly" | "lifetime" | "" {
  const p = String(input || "").trim().toLowerCase();
  if (p === "monthly" || p === "lifetime") return p;
  return "";
}

async function stripePOSTForm(path: string, stripeKey: string, form: Record<string, string>) {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `Stripe error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const stripeKey = String(env.STRIPE_SECRET_KEY || "").trim();
    if (!stripeKey) return json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, 500);

    const body = (await request.json().catch(() => null)) as any;
    const plan = planFrom(body?.plan);
    if (!plan) return badRequest("Invalid plan. Use monthly or lifetime.");

    const email = normalizeEmail(body?.email);

    const origin = getOrigin(request);
    if (!origin) return json({ ok: false, error: "Missing origin/host" }, 500);

    // ✅ Return URL includes plan=monthly|lifetime
    const returnUrl = `${origin}/dashboard?plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`;

    const common: Record<string, string> = {
      ui_mode: "embedded",
      return_url: returnUrl,
      allow_promotion_codes: "false",
      "metadata[app]": "cdl",
      "metadata[plan]": plan,
      ...(email ? { customer_email: email } : {}),
    };

    const form =
      plan === "monthly"
        ? {
            ...common,
            mode: "subscription",
            "line_items[0][price]": STRIPE_PRICE_MONTHLY,
            "line_items[0][quantity]": "1",
          }
        : {
            ...common,
            mode: "payment",
            "line_items[0][price]": STRIPE_PRICE_LIFETIME,
            "line_items[0][quantity]": "1",
          };

    const session = await stripePOSTForm("/v1/checkout/sessions", stripeKey, form);

    // Embedded Checkout needs client_secret (not session.url)
    if (!session?.id || !session?.client_secret) {
      return json({ ok: false, error: "Stripe embedded client_secret missing" }, 500);
    }

    return json({ ok: true, clientSecret: session.client_secret, sessionId: session.id }, 200);
  } catch (err: any) {
    return json({ ok: false, error: err?.message || "Server error" }, 500);
  }
};
