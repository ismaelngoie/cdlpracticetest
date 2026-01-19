// app/pay/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// --- CONFIG ---
type PlanKey = "monthly" | "lifetime";

const PRICING = {
  monthly: {
    price: 19.95,
    cadence: "/mo",
    title: "Monthly Access",
    subtitle: "Cancel anytime. Study on your phone.",
    features: [
      "Unlimited CDL Practice Tests",
      "4,000 Real Questions & Answers",
      "Full Simulator of Real Exam Access",
      "All 50 States Included",
      "Works Offline (Study at rest stops)",
    ],
  },
  lifetime: {
    price: 69.0,
    cadence: " one-time",
    title: "Lifetime Access",
    subtitle: "One payment. Keep it forever.",
    badge: "BEST VALUE",
    features: [
      "Unlimited CDL Practice Tests",
      "6,000+ Real Questions & Answers",
      "Fast Track Mode (Save Time)",
      "Full Simulator of Real Exam Access",
      "All 50 States Included",
      "Works Offline (Study at rest stops)",
      "100% Money-Back Guarantee",
    ],
  },
} as const;

const PASSING_SCORE = 80;
const CONFIG_KEY = "haulOS.config.v1";

// local storage keys for entitlement + billing email
const ACCESS_KEY = "haulOS.access.v1"; // "subscription" | "lifetime"
const EMAIL_KEY = "haulOS.email.v1"; // purchase/billing email

type UserContext = {
  score: number;
  weakDomain: string;
  userState: string;
  license: string;
  endorsements: string[];
};

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function riskFromScore(score: number) {
  if (score >= PASSING_SCORE) return { label: "CLEAR", tone: "emerald" as const };
  if (score >= 60) return { label: "ELEVATED", tone: "amber" as const };
  return { label: "HIGH", tone: "red" as const };
}

function toneClasses(tone: "emerald" | "amber" | "red") {
  if (tone === "emerald")
    return {
      ring: "ring-emerald-500/20",
      pill: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      big: "text-emerald-300",
      bar: "bg-emerald-500",
      glow: "shadow-[0_0_40px_-16px_rgba(16,185,129,0.55)]",
    };
  if (tone === "amber")
    return {
      ring: "ring-amber-500/20",
      pill: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      big: "text-amber-300",
      bar: "bg-amber-500",
      glow: "shadow-[0_0_40px_-16px_rgba(245,158,11,0.55)]",
    };
  return {
    ring: "ring-red-500/20",
    pill: "bg-red-500/10 border-red-500/30 text-red-300",
    big: "text-red-300",
    bar: "bg-red-500",
    glow: "shadow-[0_0_40px_-16px_rgba(239,68,68,0.55)]",
  };
}

function classLabel(license: string) {
  if (license === "A") return "Class A";
  if (license === "B") return "Class B";
  if (license === "C") return "Class C";
  return "Class D";
}

function formatEndorsements(list: string[]) {
  if (!list || list.length === 0) return "None";
  return list.join(", ");
}

function stepCopy(score: number, weakDomain: string, userState: string) {
  const missing = Math.max(0, PASSING_SCORE - score);

  if (score >= PASSING_SCORE) {
    return {
      headline: "Don’t fail your CDL test.",
      sub: `Your score is ${score}%. You need 80% to pass in ${userState}. Keep it above 80% and walk in confident.`,
      steps: [
        { k: "1", t: "Practice real questions", d: "Do quick sets every day. The rules will stick." },
        { k: "2", t: "Fix your weak area", d: `Focus on ${weakDomain} so you stop missing easy points.` },
        { k: "3", t: "Take the full simulator", d: "Train like the real exam until 80%+ is normal." },
      ],
    };
  }

  return {
    headline: "Don’t fail your CDL test.",
    sub: `Your score is ${score}%. You need 80% to pass in ${userState}. You are ${missing}% short.`,
    steps: [
      { k: "1", t: "Practice the same style", d: "Real exam-style questions with clear answers." },
      { k: "2", t: "Fix what makes you fail", d: `We focus on ${weakDomain} first.` },
      { k: "3", t: "Pass mode", d: "Timed practice until you clear 80%+ consistently." },
    ],
  };
}

type LoginResponse = { ok: boolean; access?: "subscription" | "lifetime" | "none"; error?: string };

async function loginWithEmail(email: string): Promise<LoginResponse> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) return { ok: false, error: json?.error || "Server error" };
  return (json || { ok: false }) as LoginResponse;
}

// Embedded Checkout: /api/checkout returns { clientSecret }
async function createCheckoutClientSecret(plan: PlanKey, email?: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ plan, email }),
  });

  const status = res.status;
  const data = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    const msg = data?.error || `Checkout failed (${status})`;
    throw new Error(String(msg));
  }

  if (!data?.ok || !data?.clientSecret) throw new Error("Checkout clientSecret missing.");
  return String(data.clientSecret);
}

declare global {
  interface Window {
    Stripe?: any;
  }
}

function loadStripeJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Stripe) return resolve();

    const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load checkout script")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load checkout script"));
    document.head.appendChild(s);
  });
}

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lifetime");

  const [ctx, setCtx] = useState<UserContext>({
    score: 42,
    weakDomain: "General Knowledge",
    userState: "TX",
    license: "A",
    endorsements: [],
  });

  // Restore
  const [restoreEmail, setRestoreEmail] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");

  // Checkout (Embedded) UX
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const embeddedRef = useRef<any>(null);
  const [embedParams, setEmbedParams] = useState<{ plan: PlanKey; email?: string } | null>(null);

  const checkoutSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = parseInt(localStorage.getItem("diagnosticScore") || "42", 10);
    const weakDomain = localStorage.getItem("weakestDomain") || "General Knowledge";
    const userState = localStorage.getItem("userState") || "TX";

    const saved = safeParseJSON<{ license?: string; endorsements?: string[]; userState?: string }>(
      localStorage.getItem(CONFIG_KEY)
    );

    const legacyLicense = localStorage.getItem("userLevel") || "A";
    const legacyEnd = safeParseJSON<string[]>(localStorage.getItem("userEndorsements")) || [];

    const license = saved?.license || legacyLicense || "A";
    const endorsements = Array.isArray(saved?.endorsements) ? saved.endorsements : legacyEnd;

    setCtx({
      score: Number.isFinite(s) ? clamp(s, 0, 100) : 42,
      weakDomain,
      userState,
      license,
      endorsements,
    });
  }, []);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "monthly" || plan === "lifetime") setSelectedPlan(plan);
  }, [searchParams]);

  useEffect(() => {
    const urlEmail = String(searchParams.get("email") || "").trim().toLowerCase();
    if (urlEmail && urlEmail.includes("@")) {
      setRestoreEmail(urlEmail);
      return;
    }

    try {
      const saved = String(localStorage.getItem(EMAIL_KEY) || localStorage.getItem("userEmail") || "").trim();
      if (saved && saved.includes("@")) setRestoreEmail(saved.toLowerCase());
    } catch {}
  }, [searchParams]);

  // Scroll into checkout when opened
  useEffect(() => {
    if (!checkoutOpen) return;
    const t = setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [checkoutOpen]);

  const { label: risk, tone } = riskFromScore(ctx.score);
  const tc = toneClasses(tone);

  const copy = useMemo(() => stepCopy(ctx.score, ctx.weakDomain, ctx.userState), [ctx.score, ctx.weakDomain, ctx.userState]);

  const progressToPass = useMemo(() => {
    const pct = (ctx.score / PASSING_SCORE) * 100;
    return clamp(Math.round(pct), 0, 100);
  }, [ctx.score]);

  // ✅ CTA text
  const stickyCtaText = useMemo(() => {
    return selectedPlan === "lifetime" ? "GET LIFETIME ACCESS" : "START MONTHLY ACCESS";
  }, [selectedPlan]);

  const persistEmail = (email: string) => {
    const e = String(email || "").trim().toLowerCase();
    if (!e.includes("@")) return;
    try {
      localStorage.setItem(EMAIL_KEY, e);
      localStorage.setItem("userEmail", e);
      localStorage.setItem("billingEmail", e);
    } catch {}
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutErr("");
    setCheckoutBusy(false);
    setEmbedParams(null);

    // cleanup embedded instance + container
    try {
      embeddedRef.current?.destroy?.();
    } catch {}
    try {
      embeddedRef.current?.unmount?.();
    } catch {}
    embeddedRef.current = null;

    const host = document.getElementById("embedded-checkout");
    if (host) host.innerHTML = "";
  };

  // ✅ CTA triggers checkout immediately
  const startCheckout = () => {
    setCheckoutErr("");

    const e = String(restoreEmail || "").trim().toLowerCase();
    const email = e.includes("@") ? e : undefined;
    if (email) persistEmail(email);

    if (!stripePk) {
      setCheckoutErr("Missing payment key. Please contact support.");
      setCheckoutOpen(true);
      setCheckoutBusy(false);
      setEmbedParams(null);
      return;
    }

    setCheckoutBusy(true);
    setCheckoutOpen(true);
    setEmbedParams({ plan: selectedPlan, email });
  };

  // Mount embedded checkout inline
  useEffect(() => {
    let cancelled = false;

    async function mountEmbedded(plan: PlanKey, email?: string) {
      try {
        // cleanup old
        try {
          embeddedRef.current?.destroy?.();
        } catch {}
        try {
          embeddedRef.current?.unmount?.();
        } catch {}
        embeddedRef.current = null;

        const host = document.getElementById("embedded-checkout");
        if (host) host.innerHTML = "";

        await loadStripeJs();
        if (cancelled) return;

        const stripe = window.Stripe?.(stripePk);
        if (!stripe) throw new Error("Payment system failed to start.");

        const embeddedCheckout = await stripe.initEmbeddedCheckout({
          fetchClientSecret: async () => {
            const cs = await createCheckoutClientSecret(plan, email);
            return cs;
          },
        });

        if (cancelled) return;

        embeddedRef.current = embeddedCheckout;
        embeddedCheckout.mount("#embedded-checkout");

        setCheckoutBusy(false);
      } catch (err: any) {
        setCheckoutErr(err?.message || "Could not load secure checkout.");
        setCheckoutBusy(false);
      }
    }

    if (checkoutOpen && embedParams?.plan) {
      mountEmbedded(embedParams.plan, embedParams.email);
    }

    return () => {
      cancelled = true;
    };
  }, [checkoutOpen, embedParams, stripePk]);

  const handleRestore = async () => {
    const email = String(restoreEmail || "").trim().toLowerCase();
    if (!email.includes("@")) {
      setRestoreMsg("Enter your email.");
      return;
    }

    setRestoreMsg("");
    setIsRestoring(true);

    try {
      const result = await loginWithEmail(email);

      if (result?.ok && (result.access === "subscription" || result.access === "lifetime")) {
        persistEmail(email);
        try {
          localStorage.setItem(ACCESS_KEY, result.access);
        } catch {}

        setIsRestoring(false);
        router.push("/profile");
        return;
      }

      setRestoreMsg("We can’t find that email. Try another email or contact support.");
      setIsRestoring(false);
    } catch {
      setRestoreMsg("We can’t find that email. Try another email or contact support.");
      setIsRestoring(false);
    }
  };

  const ValueChip = ({ children }: { children: React.ReactNode }) => (
    <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">
      {children}
    </span>
  );

  const isFailing = ctx.score < PASSING_SCORE;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-10">
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-7">
          <div className="flex flex-nowrap justify-center gap-1.5 mb-4">
            <ValueChip>12,000+ drivers</ValueChip>
            <ValueChip>All 50 states</ValueChip>
            <ValueChip>Pass guarantee</ValueChip>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${tc.pill} text-[10px] font-black uppercase tracking-widest mb-4`}
          >
            ⚠️ Your Results • {ctx.userState} • {classLabel(ctx.license)}
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-3">
            Don’t fail your <span className="text-amber-500">CDL test.</span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            {copy.sub}
          </p>

          {/* Scary highlight */}
          <AnimatePresence>
            {isFailing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-left"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-red-200">
                  Warning
                </div>
                <div className="text-sm font-black text-red-100 mt-1">
                  If you take the test today, you will fail.
                </div>
                <div className="text-[11px] text-red-100/80 mt-1">
                  You need <span className="font-black">80%</span> to pass in <span className="font-black">{ctx.userState}</span>. Don’t risk your test fee.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score + Progress */}
          <div className={`mt-6 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-5 ring-1 ${tc.ring}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your score</div>
                <div className="text-2xl font-black">
                  {ctx.score}% <span className={`text-sm ${tc.big}`}>({risk})</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  You need <span className="font-black text-white">{PASSING_SCORE}%</span> to pass.
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weak area</div>
                <div className="text-sm font-black text-white">{ctx.weakDomain}</div>
                <div className="text-[11px] text-slate-400 mt-1">Fix this first.</div>
              </div>
            </div>

            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className={`h-full ${tc.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressToPass}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <span>Now: {ctx.score}%</span>
              <span>Pass: {PASSING_SCORE}%</span>
            </div>
          </div>

          <div className="mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Setup: {ctx.userState} • {classLabel(ctx.license)} • Endorsements: {formatEndorsements(ctx.endorsements)}
          </div>

          {/* Why section */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
            <div className="text-xs font-black uppercase tracking-widest text-slate-300">
              Why 12,000+ drivers use our practice tests
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-emerald-400 font-black">✓</span>
                Simple answers. No confusing words.
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-emerald-400 font-black">✓</span>
                Practice tests + full simulator like the real exam.
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-200">
                <span className="text-emerald-400 font-black">✓</span>
                Works offline at rest stops. Covers all 50 states.
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-100 leading-relaxed">
              Start today. Your test date can come fast. Don’t wait.
            </div>
          </div>
        </motion.div>

        {/* WHAT YOU GET */}
        <div className="grid grid-cols-1 gap-3 mb-7">
          {copy.steps.map((s) => (
            <div key={s.k} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
                  <span className="text-amber-300 font-black">{s.k}</span>
                </div>
                <div>
                  <div className="font-black text-white">{s.t}</div>
                  <div className="text-sm text-slate-400 mt-0.5 leading-relaxed">{s.d}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PLANS */}
        <div className="space-y-4 mb-10">
          {/* Lifetime */}
          <button
            onClick={() => setSelectedPlan("lifetime")}
            className={`relative w-full p-5 rounded-3xl border-2 text-left transition-all group ${
              selectedPlan === "lifetime"
                ? "bg-amber-500/10 border-amber-500 shadow-[0_0_34px_rgba(245,158,11,0.18)]"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
            aria-label="Select lifetime access plan"
          >
            {selectedPlan === "lifetime" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
                Best value
              </div>
            )}

            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-black ${selectedPlan === "lifetime" ? "text-white" : "text-slate-200"}`}>
                    {PRICING.lifetime.title}
                  </h3>
                  <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-300">
                    {PRICING.lifetime.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{PRICING.lifetime.subtitle}</p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-white">${PRICING.lifetime.price.toFixed(2)}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">one-time</div>
              </div>
            </div>

            <AnimatePresence>
              {selectedPlan === "lifetime" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10 space-y-2"
                >
                  {PRICING.lifetime.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                      <span className="text-emerald-400 font-black">✓</span> {feat}
                    </div>
                  ))}

                  <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-200 leading-relaxed">
                    <span className="font-black">Guarantee:</span> If you don’t pass after using the app, request a refund.
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-2">
                    🔒 Secure payment • 100% money-back guarantee (lifetime)
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`relative w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selectedPlan === "monthly"
                ? "bg-white/5 border-slate-500"
                : "bg-slate-900/60 border-slate-800 opacity-90 hover:opacity-100 hover:border-slate-700"
            }`}
            aria-label="Select monthly access plan"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className="text-md font-black text-slate-200">{PRICING.monthly.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{PRICING.monthly.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-slate-200">${PRICING.monthly.price.toFixed(2)}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">/mo</div>
              </div>
            </div>

            <AnimatePresence>
              {selectedPlan === "monthly" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10 space-y-2"
                >
                  {PRICING.monthly.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                      <span className="text-emerald-400 font-black">✓</span> {feat}
                    </div>
                  ))}

                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-2">
                    Cancel anytime • Keep access until your billing date
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-2">
                    🔒 Secure payment • 100% money-back guarantee (lifetime)
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* EMBEDDED CHECKOUT (INLINE ON PAGE) */}
        <AnimatePresence>
          {checkoutOpen && (
            <motion.section
              ref={checkoutSectionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 text-left ring-1 ring-white/5"
              aria-label="Checkout section"
            >
              {/* Top bar */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xs font-black text-slate-200 uppercase tracking-widest">
                      Finish payment. Get instant access.
                    </div>
                    <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200">
                      Pass guarantee
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300">
                      12,000+ drivers
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Pay below and unlock {selectedPlan === "lifetime" ? "6,000+ real questions" : "4,000 real questions"} + the full simulator.
                  </div>
                </div>

                <button
                  onClick={closeCheckout}
                  className="shrink-0 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10"
                  aria-label="Close checkout"
                >
                  Back
                </button>
              </div>

              {/* Error / Loading */}
              {checkoutErr ? (
                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                  <div className="text-xs font-black text-red-200 uppercase tracking-widest">Checkout issue</div>
                  <div className="text-xs text-red-100 mt-1">{checkoutErr}</div>
                  <button
                    onClick={() => {
                      closeCheckout();
                      setTimeout(() => startCheckout(), 50);
                    }}
                    className="mt-3 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {checkoutBusy ? (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-black text-slate-200 uppercase tracking-widest">
                    Loading secure checkout…
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Almost ready.
                  </div>
                </div>
              ) : null}

              {/* Layout: Checkout + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Checkout Embed */}
                <div className="md:col-span-3">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40">
                    <div id="embedded-checkout" className="min-h-[560px]" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">🔒 Secure payment</span>
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">Instant access</span>
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">All 50 states</span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-100 leading-relaxed">
                    Most people fail because they don’t practice enough. Practice today. Pass sooner.
                  </div>
                </div>

                {/* Summary */}
                <aside className="md:col-span-2">
                  <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${tc.glow}`}>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      What you get today
                    </div>

                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white">{PRICING[selectedPlan].title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {selectedPlan === "lifetime"
                            ? "One payment. Keep access forever."
                            : "Monthly access. Cancel anytime."}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-white">
                          ${PRICING[selectedPlan].price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                          {selectedPlan === "lifetime" ? "one-time" : "per month"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {PRICING[selectedPlan].features.slice(0, 5).map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                          <span className="text-emerald-400 font-black">✓</span> {feat}
                        </div>
                      ))}
                    </div>

                    {selectedPlan === "lifetime" ? (
                      <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-200 leading-relaxed">
                        <span className="font-black">100% money-back guarantee:</span> If you don’t pass after using the app, request a refund.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-slate-950/40 border border-white/10 p-3 text-[11px] text-slate-400 leading-relaxed">
                        Cancel anytime. Keep access until your billing date.
                      </div>
                    )}

                    <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                      Need help? Email{" "}
                      <a className="underline text-white font-bold" href="mailto:contact@cdlpretest.com">
                        contact@cdlpretest.com
                      </a>
                      .
                    </div>
                  </div>
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* RESTORE */}
        <div className="mt-10 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Restore access</h4>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Already paid?</span>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              value={restoreEmail}
              onChange={(e) => setRestoreEmail(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
            />
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 ${
                isRestoring ? "bg-slate-800 text-slate-400" : "bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              {isRestoring ? "Checking..." : "Restore"}
            </button>
          </div>

          <AnimatePresence>
            {restoreMsg && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="text-xs text-amber-300 mt-3"
              >
                {restoreMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-500 font-mono mt-4">
            Tip: Use the same email you paid with.
          </p>
        </div>

        <div className="h-10" />
      </main>

      {/* STICKY CHECKOUT CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-white/5 z-50">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Selected: {PRICING[selectedPlan].title}
              </div>
              <div className="text-xs text-slate-500">
                {selectedPlan === "lifetime" ? "One-time payment • Lifetime access" : "Monthly • Cancel anytime"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-white">
                ${PRICING[selectedPlan].price.toFixed(2)}
                <span className="text-xs text-slate-500">
                  {" "}
                  {selectedPlan === "lifetime" ? "" : PRICING[selectedPlan].cadence}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={startCheckout}
            disabled={checkoutBusy}
            className={`block w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-lg text-center uppercase tracking-widest transition-transform active:scale-95 ${tc.glow} disabled:opacity-60`}
          >
            {checkoutBusy ? "Opening…" : stickyCtaText}
          </button>

          <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-2 font-mono uppercase tracking-widest">
            <span>🔒 Secure payment</span> • <span>Instant access</span> •{" "}
            <span>{selectedPlan === "lifetime" ? "100% money-back guarantee" : "Cancel anytime"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PaywallContent />
    </Suspense>
  );
}
