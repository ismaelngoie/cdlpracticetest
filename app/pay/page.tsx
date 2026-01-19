"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/Modal";

// --- CONFIG ---
type PlanKey = "monthly" | "lifetime";

// STRATEGY: "Hardware Store" Language. No SaaS fluff.
const PRICING = {
  monthly: {
    price: 19.95,
    cadence: "per month",
    title: "Monthly Access",
    subtitle: "Good for quick study. Cancel anytime.",
    features: [
      "Standard Practice Tests",
      "4,000 Real Questions & Answers",
      "All 50 States Included",
      "Works Offline (Study at rest stops)",
    ],
  },
  lifetime: {
    price: 69.0,
    cadence: "Pay Once. Own Forever.",
    title: "Pass Guarantee (Lifetime)",
    subtitle: "One payment. Own it forever. Pass or full refund.",
    badge: "DRIVER'S CHOICE",
    features: [
      "Unlimited CDL Practice Tests", // Keyword hit
      "6,000+ Real Questions & Answers",
      "Fast Track Mode (Save Time)",
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
  if (score >= PASSING_SCORE) return { label: "READY", tone: "emerald" as const };
  if (score >= 60) return { label: "RISKY", tone: "amber" as const };
  return { label: "NOT READY", tone: "red" as const };
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

// STRATEGY: Fear-based header copy
function stepCopy(score: number, weakDomain: string, userState: string) {
  if (score >= PASSING_SCORE) {
    return {
      tagline: "✅ STATUS: READY",
      headline: "Don't risk a retake.",
      sub: `You are at ${score}%. Lock in your knowledge so you pass the ${userState} test on the first try.`,
      steps: [
        { k: "1", t: "Confirm Mastery", d: "Prove you know it." },
        { k: "2", t: "Timed Reps", d: "Build speed." },
        { k: "3", t: "Pass Mode", d: "Simulate the real test." },
      ],
    };
  }
  return {
    tagline: "⚠️ STATUS: NOT READY",
    headline: "Don't Fail Your CDL Test.",
    sub: `Your score is **${score}%**. You need **80%** to pass in ${userState}. If you take the test today, **you will fail.**`,
    steps: [
      { k: "1", t: "Diagnose", d: `Finds what you don't know.` },
      { k: "2", t: "Fix Plan", d: `Trains only your weak spots.` },
      { k: "3", t: "Pass Mode", d: "Simulates the real exam." },
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
      existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Stripe.js"));
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
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const embeddedRef = useRef<any>(null);
  const [embedParams, setEmbedParams] = useState<{ plan: PlanKey; email?: string } | null>(null);

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

  const { label: risk, tone } = riskFromScore(ctx.score);
  const tc = toneClasses(tone);
  const copy = useMemo(() => stepCopy(ctx.score, ctx.weakDomain, ctx.userState), [ctx.score, ctx.weakDomain, ctx.userState]);
  
  const progressToPass = useMemo(() => {
    const pct = (ctx.score / PASSING_SCORE) * 100;
    return clamp(Math.round(pct), 0, 100);
  }, [ctx.score]);

  // STRATEGY: Dynamic Button Logic (The "Best" logic)
  const stickyCtaText = useMemo(() => {
    return selectedPlan === "lifetime"
      ? `GET LIFETIME ACCESS`
      : "START MONTHLY ACCESS";
  }, [selectedPlan]);

  const stickySubtext = useMemo(() => {
    return selectedPlan === "lifetime"
      ? "🔒 Secure Payment • 100% Money-Back Guarantee"
      : "🔒 Secure Payment • Cancel Anytime";
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

  const closeCheckoutModal = () => {
    setCheckoutModalOpen(false);
    setCheckoutErr("");
    setCheckoutBusy(false);
    setEmbedParams(null);
    // cleanup embedded instance + container
    try { embeddedRef.current?.destroy?.(); } catch {}
    try { embeddedRef.current?.unmount?.(); } catch {}
    embeddedRef.current = null;
    const host = document.getElementById("embedded-checkout");
    if (host) host.innerHTML = "";
  };

  const startCheckout = () => {
    setCheckoutErr("");
    // Optional prefill: if restoreEmail is valid, send as customer_email; otherwise Stripe will collect it in checkout
    const e = String(restoreEmail || "").trim().toLowerCase();
    const email = e.includes("@") ? e : undefined;
    if (email) persistEmail(email);

    if (!stripePk) {
      setCheckoutErr("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
      setCheckoutModalOpen(true);
      setCheckoutBusy(false);
      setEmbedParams(null);
      return;
    }

    setCheckoutBusy(true);
    setCheckoutModalOpen(true);
    setEmbedParams({ plan: selectedPlan, email });
  };

  // Mount Stripe Embedded Checkout in the modal
  useEffect(() => {
    let cancelled = false;
    async function mountEmbedded(plan: PlanKey, email?: string) {
      try {
        // cleanup old
        try { embeddedRef.current?.destroy?.(); } catch {}
        try { embeddedRef.current?.unmount?.(); } catch {}
        embeddedRef.current = null;
        const host = document.getElementById("embedded-checkout");
        if (host) host.innerHTML = "";

        await loadStripeJs();
        if (cancelled) return;
        const stripe = window.Stripe?.(stripePk);
        if (!stripe) throw new Error("Stripe failed to initialize.");

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

    if (checkoutModalOpen && embedParams?.plan) {
      mountEmbedded(embedParams.plan, embedParams.email);
    }

    return () => {
      cancelled = true;
    };
  }, [checkoutModalOpen, embedParams, stripePk]);

  const handleRestore = async () => {
    const email = String(restoreEmail || "").trim().toLowerCase();
    if (!email.includes("@")) {
      setRestoreMsg("Please enter a valid email.");
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
      setRestoreMsg("We couldn’t find that email. If you just purchased, check your inbox for the Stripe receipt.");
      setIsRestoring(false);
    } catch {
      setRestoreMsg("We couldn’t find that email. If you just purchased, check your inbox for the Stripe receipt.");
      setIsRestoring(false);
    }
  };

  const ValueChip = ({ children }: { children: React.ReactNode }) => (
    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">
      {children}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-40">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* Embedded Checkout modal */}
      <Modal
        open={checkoutModalOpen}
        title="Secure Checkout"
        subtitle="Complete payment to start now."
        onClose={closeCheckoutModal}
        tone="amber"
      >
        <div className="space-y-3">
          {checkoutErr ? <div className="text-xs text-red-300">{checkoutErr}</div> : null}
          {checkoutBusy ? (
            <div className="text-xs text-slate-400">Loading secure payment...</div>
          ) : null}
          {/* Stripe mounts here */}
          <div
            id="embedded-checkout"
            className="min-h-[560px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80"
          />
          <div className="text-[11px] text-slate-500">
            Support:{" "}
            <a
              className="underline text-white font-bold"
              href="mailto:contact@cdlpretest.com?subject=Support%20Request&body=Description%20of%20issue:"
            >
              contact@cdlpretest.com
            </a>
          </div>
        </div>
      </Modal>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        {/* HEADER - "The Wake-Up Call" */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tc.pill} text-[11px] font-black uppercase tracking-widest mb-4`}>
             {copy.tagline}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[0.95] mb-4 text-white">
            {copy.headline}
          </h1>
          
          {/* Dangerously set inner HTML for bolding dynamic parts from stepCopy */}
          <div 
            className="text-slate-300 text-md leading-relaxed px-2"
            dangerouslySetInnerHTML={{ __html: copy.sub }} 
          />

          {/* Score + Progress */}
          <div className={`mt-8 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6 ring-1 ${tc.ring}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Score</div>
                <div className="text-3xl font-black">
                  {ctx.score}% <span className={`text-base ${tc.big}`}>({risk})</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Test Config</div>
                <div className="text-sm font-black text-white">{ctx.userState} • Class {ctx.license}</div>
              </div>
            </div>
            
            <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden mt-2">
               {/* Marker for passing score */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 opacity-30" style={{ left: '80%' }} />
              <motion.div
                className={`h-full ${tc.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressToPass}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            </div>
            
            <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <span>Current</span>
              <span>Pass (80%)</span>
            </div>
          </div>
        </motion.div>

        {/* PLANS - "Investment vs Rental" */}
        <div className="space-y-5 mb-12">
          
          {/* Lifetime Card (Hero) */}
          <button
            onClick={() => setSelectedPlan("lifetime")}
            className={`relative w-full p-6 rounded-3xl border-2 text-left transition-all group ${
              selectedPlan === "lifetime"
                ? "bg-amber-500/10 border-amber-500 shadow-[0_0_34px_rgba(245,158,11,0.18)]"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
            aria-label="Select Lifetime Plan"
          >
            {selectedPlan === "lifetime" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[11px] font-black px-4 py-1 rounded-full uppercase tracking-wide shadow-lg whitespace-nowrap">
                {PRICING.lifetime.badge}
              </div>
            )}
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className={`text-xl font-black ${selectedPlan === "lifetime" ? "text-white" : "text-slate-200"}`}>
                  {PRICING.lifetime.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed max-w-[180px]">
                  {PRICING.lifetime.subtitle}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-white">${PRICING.lifetime.price}</div>
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  {PRICING.lifetime.cadence}
                </div>
              </div>
            </div>
            <AnimatePresence>
              {selectedPlan === "lifetime" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 pt-5 border-t border-white/10 space-y-2.5"
                >
                  {PRICING.lifetime.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className={feat.includes("Unlimited") ? "font-black text-white" : "font-medium"}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Monthly Card (Anchor) */}
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`relative w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selectedPlan === "monthly"
                ? "bg-white/5 border-slate-500"
                : "bg-slate-900/60 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700"
            }`}
            aria-label="Select Monthly Plan"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-200">{PRICING.monthly.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{PRICING.monthly.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-slate-200">${PRICING.monthly.price}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{PRICING.monthly.cadence}</div>
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
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                       <span className={feat.includes("No Money") ? "text-red-400 font-black" : "text-slate-500"}>
                         {feat.includes("No Money") ? "✕" : "•"}
                       </span>
                       <span className={feat.includes("No Money") ? "text-red-300 font-bold" : ""}>
                         {feat}
                       </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* TRUST SECTION - "Why Drivers Use Us" (The Closer) */}
        <div className="mb-10 px-2">
            <h4 className="text-center text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Why 12,000+ Drivers Use our practice tests.</h4>
            <div className="grid gap-4">
                <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center shrink-0 font-black text-sm">1</div>
                    <div>
                        <div className="text-sm font-bold text-white">Simulate the Real Exam</div>
                        <div className="text-xs text-slate-400 leading-relaxed mt-0.5">We use the exact same timer and rules as the DMV.</div>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center shrink-0 font-black text-sm">2</div>
                    <div>
                        <div className="text-sm font-bold text-white">Don't Waste Time</div>
                        <div className="text-xs text-slate-400 leading-relaxed mt-0.5">Our system hides questions you already know.</div>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center shrink-0 font-black text-sm">3</div>
                    <div>
                        <div className="text-sm font-bold text-white">Simple English</div>
                        <div className="text-xs text-slate-400 leading-relaxed mt-0.5">We explain the answers simply so you understand the rules.</div>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center shrink-0 font-black text-sm">4</div>
                    <div>
                        <div className="text-sm font-bold text-white">Instant Access</div>
                        <div className="text-xs text-slate-400 leading-relaxed mt-0.5">Start studying 10 seconds after you pay.</div>
                    </div>
                </div>
            </div>
        </div>

        {/* RESTORE LINK */}
        <div className="text-center mb-10">
             <button 
                onClick={() => {
                   const email = prompt("Enter your purchase email:");
                   if(email) { setRestoreEmail(email); handleRestore(); }
                }}
                className="text-[10px] uppercase tracking-widest text-slate-500 font-bold hover:text-white transition-colors"
             >
                Already paid? Restore Access
             </button>
             <AnimatePresence>
                {restoreMsg && <div className="text-xs text-amber-500 mt-2">{restoreMsg}</div>}
             </AnimatePresence>
        </div>

      </main>

      {/* STICKY FOOTER - "The Trigger" */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={startCheckout}
            disabled={checkoutBusy}
            className={`block w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xl text-center uppercase tracking-widest transition-transform active:scale-95 ${tc.glow} disabled:opacity-60 shadow-lg`}
          >
            {checkoutBusy ? "PROCESSING..." : stickyCtaText}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
            {stickySubtext}
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
