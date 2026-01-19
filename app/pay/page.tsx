"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "@/components/Modal";

type PlanKey = "monthly" | "lifetime";

const PRICING = {
  lifetime: {
    title: "Lifetime Access",
    subtitle: "Pay once. Use forever.",
    price: 69,
    badge: "Best Deal",
    features: ["All practice tests", "Full simulator", "More questions", "Lifetime updates"],
  },
  monthly: {
    title: "Monthly Access",
    subtitle: "Pay monthly. Cancel anytime.",
    price: 19.95,
    cadence: "/mo",
    features: ["All practice tests", "Full simulator", "Unlimited tries", "Cancel anytime"],
  },
} as const;

const PASSING_SCORE = 80;
const EMAIL_KEY = "haulOS.email.v1";
const CONFIG_KEY = "haulOS.config.v1";

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

async function createCheckout(plan: PlanKey, email?: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ plan, email }),
  });

  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(data?.error || "Checkout failed.");
  if (!data?.ok || !data?.url) throw new Error("Checkout URL missing.");
  return String(data.url);
}

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lifetime");

  const [ctx, setCtx] = useState<UserContext>({
    score: 42,
    weakDomain: "General Knowledge",
    userState: "TX",
    license: "A",
    endorsements: [],
  });

  // Restore email
  const [email, setEmail] = useState("");

  // Checkout modal
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutEmailDraft, setCheckoutEmailDraft] = useState("");

  const lifetimeRef = useRef<HTMLButtonElement | null>(null);
  const monthlyRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "monthly" || plan === "lifetime") setSelectedPlan(plan);
  }, [searchParams]);

  useEffect(() => {
    // Load context from localStorage (simple)
    const s = parseInt(localStorage.getItem("diagnosticScore") || "42", 10);
    const weakDomain = localStorage.getItem("weakestDomain") || "General Knowledge";
    const userState = localStorage.getItem("userState") || "TX";

    const saved = safeParseJSON<{ license?: string; endorsements?: string[] }>(
      localStorage.getItem(CONFIG_KEY)
    );

    setCtx({
      score: Number.isFinite(s) ? clamp(s, 0, 100) : 42,
      weakDomain,
      userState,
      license: saved?.license || (localStorage.getItem("userLevel") || "A"),
      endorsements: Array.isArray(saved?.endorsements) ? saved!.endorsements! : [],
    });

    // Load email (simple)
    const savedEmail = String(localStorage.getItem(EMAIL_KEY) || "").trim().toLowerCase();
    if (savedEmail.includes("@")) setEmail(savedEmail);
  }, []);

  const progressToPass = useMemo(() => {
    const pct = (ctx.score / PASSING_SCORE) * 100;
    return clamp(Math.round(pct), 0, 100);
  }, [ctx.score]);

  const persistEmail = (e: string) => {
    const v = String(e || "").trim().toLowerCase();
    if (!v.includes("@")) return;
    localStorage.setItem(EMAIL_KEY, v);
  };

  const selectPlan = (plan: PlanKey) => {
    setSelectedPlan(plan);
    router.replace(`/pay?plan=${plan}`, { scroll: false });

    // Make sure the expanded plan stays visible
    requestAnimationFrame(() => {
      const el = plan === "monthly" ? monthlyRef.current : lifetimeRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const beginCheckout = async (rawEmail: string) => {
    const e = String(rawEmail || "").trim().toLowerCase();

    if (!e.includes("@")) {
      setCheckoutEmailDraft(e);
      setCheckoutErr("");
      setCheckoutModalOpen(true);
      return;
    }

    setCheckoutErr("");
    setCheckoutBusy(true);
    persistEmail(e);

    try {
      const url = await createCheckout(selectedPlan, e);
      window.location.href = url; // Stripe redirect (expected)
    } catch (err: any) {
      setCheckoutErr(err?.message || "Could not start checkout.");
      setCheckoutBusy(false);
      setCheckoutModalOpen(true);
    }
  };

  const primaryCta =
    selectedPlan === "lifetime"
      ? "Pay Once • Get Lifetime Access →"
      : "Start Monthly • Get Full Access →";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />

      <Modal
        open={checkoutModalOpen}
        title="Secure Checkout"
        subtitle="Enter the email for receipts and access restore."
        onClose={() => setCheckoutModalOpen(false)}
        tone="amber"
      >
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Email
          </div>
          <input
            value={checkoutEmailDraft}
            onChange={(e) => setCheckoutEmailDraft(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
          />

          {checkoutErr ? <div className="text-xs text-red-300">{checkoutErr}</div> : null}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => beginCheckout(checkoutEmailDraft)}
              disabled={checkoutBusy}
              className="flex-1 px-4 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-widest hover:bg-amber-400 disabled:opacity-60"
            >
              {checkoutBusy ? "Opening…" : "Continue →"}
            </button>
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="px-4 py-3 rounded-2xl border border-slate-700 bg-white/5 font-black text-xs uppercase tracking-widest hover:bg-white/10"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-slate-400">
            You will use this email to restore access (no password).
          </div>
        </div>
      </Modal>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300">
            {ctx.userState} • Class {ctx.license}
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight">
            Pass your CDL test faster.
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Your score is <span className="text-white font-black">{ctx.score}%</span>. Weak area:{" "}
            <span className="text-white font-black">{ctx.weakDomain}</span>.
          </p>

          {/* Progress */}
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Progress to {PASSING_SCORE}%
              </div>
              <div className="text-sm font-black text-white">{progressToPass}%</div>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${progressToPass}%` }} />
            </div>

            <div className="mt-3 text-xs text-slate-400 leading-relaxed">
              What you get: Practice tests + explanations + full simulator.
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {/* Lifetime */}
          <button
            ref={lifetimeRef}
            onClick={() => selectPlan("lifetime")}
            className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selectedPlan === "lifetime"
                ? "bg-amber-500/10 border-amber-500"
                : "bg-white/5 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-black">{PRICING.lifetime.title}</div>
                  <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-300">
                    {PRICING.lifetime.badge}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{PRICING.lifetime.subtitle}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black">${PRICING.lifetime.price.toFixed(2)}</div>
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
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Monthly */}
          <button
            ref={monthlyRef}
            onClick={() => selectPlan("monthly")}
            className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selectedPlan === "monthly"
                ? "bg-white/10 border-slate-400"
                : "bg-white/5 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-lg font-black">{PRICING.monthly.title}</div>
                <div className="text-xs text-slate-400 mt-1">{PRICING.monthly.subtitle}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">${PRICING.monthly.price.toFixed(2)}</div>
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
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Primary button right under plans (no scrolling needed) */}
          <button
            onClick={() => beginCheckout(email)}
            disabled={checkoutBusy}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base uppercase tracking-widest disabled:opacity-60"
          >
            {checkoutBusy ? "Opening…" : primaryCta}
          </button>

          {/* Restore email input */}
          <div className="mt-6 p-5 rounded-3xl bg-white/5 border border-white/10 text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Email (for receipts + restore)
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  if (v.includes("@")) persistEmail(v);
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
              />
              <button
                onClick={() => router.push("/profile")}
                className="px-4 py-3 rounded-2xl border border-slate-700 bg-white/5 font-black text-xs uppercase tracking-widest hover:bg-white/10"
              >
                Restore
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              If you already paid, go to Profile and restore with your purchase email.
            </div>
          </div>
        </div>
      </main>

      {/* Simple sticky bar (always visible) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Selected: {PRICING[selectedPlan].title}
            </div>
            <div className="text-xs text-slate-500">
              {selectedPlan === "lifetime" ? "One-time payment" : "Monthly payment"}
            </div>
          </div>

          <button
            onClick={() => beginCheckout(email)}
            disabled={checkoutBusy}
            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest disabled:opacity-60"
          >
            {checkoutBusy ? "Opening…" : "Checkout →"}
          </button>
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
