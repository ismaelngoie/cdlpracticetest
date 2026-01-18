// app/pay/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// --- CONFIG ---
type PlanKey = "monthly" | "lifetime";

const STRIPE_LINKS: Record<PlanKey, string> = {
  // ⚠️ Replace with your real Stripe payment links
  monthly: "https://buy.stripe.com/test_monthly",
  lifetime: "https://buy.stripe.com/test_lifetime",
};

const PRICING = {
  monthly: {
    price: 19.95,
    cadence: "/mo",
    title: "Practice Pass",
    subtitle: "Cancel anytime. Good for quick refreshers.",
    features: ["4,000+ questions", "Full Simulator Access", "Smart Fix Plan", "Unlimited Retakes"],
  },
  lifetime: {
    price: 69.0,
    cadence: " one-time",
    title: "Pass Guarantee",
    subtitle: "Get your CDL or money back. Own it forever.",
    badge: "BEST VALUE",
    features: [
      "Everything in Monthly",
      "6,000+ questions",
      "Lifetime Updates",
      "100% Money-Back Guarantee",
      "Priority Fix Plan (fast path)",
    ],
  },
} as const;

const PASSING_SCORE = 80;

// Optional: keep in sync with your sim page config key
const CONFIG_KEY = "haulOS.config.v1";

// ✅ NEW: local storage keys for entitlement + billing email (used by restore + profile)
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
      headline: "Lock in your pass.",
      sub: `You’re at ${score}%. Fix the last weak spots and walk into the ${userState} test confident.`,
      steps: [
        { k: "1", t: "Confirm mastery", d: "Run targeted sets until your weak domain never misses." },
        { k: "2", t: "Timed reps", d: "Build speed under pressure so test day feels easy." },
        { k: "3", t: "Final sweep", d: "Practice the full simulator until you’re consistently 80%+." },
      ],
    };
  }
  return {
    headline: `You’re ${missing}% away from passing.`,
    sub: `Your weakness is ${weakDomain}. Your Fix Plan trains only what fails you in ${userState}.`,
    steps: [
      { k: "1", t: "Diagnose", d: `We map your mistakes to ${weakDomain}.` },
      { k: "2", t: "Fix Plan", d: "Targeted drills + explanations so the rule sticks." },
      { k: "3", t: "Pass Mode", d: "Timed simulator until you clear 80%+ consistently." },
    ],
  };
}

// ✅ NEW: Login response type matches your /api/login function
type LoginResponse = { ok: boolean; access?: "subscription" | "lifetime"; error?: string };

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

  if (!res.ok) {
    return { ok: false, error: json?.error || "Server error" };
  }

  return (json || { ok: false }) as LoginResponse;
}

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lifetime");

  // Personalization
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

  // Sticky CTA behavior
  const [showSticky, setShowSticky] = useState(true);
  const topCtaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = parseInt(localStorage.getItem("diagnosticScore") || "42", 10);
    const weakDomain = localStorage.getItem("weakestDomain") || "General Knowledge";
    const userState = localStorage.getItem("userState") || "TX";

    // Load license/endorsements from config if present, else legacy
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
    const onScroll = () => {
      const el = topCtaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const near = rect.top < 140 && rect.bottom > 140;
      setShowSticky(!near);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Plan can be set via URL: /pay?plan=monthly
  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "monthly" || plan === "lifetime") setSelectedPlan(plan);
  }, [searchParams]);

  // ✅ NEW: prefill restore email from URL (?email=) or saved local storage email
  useEffect(() => {
    const urlEmail = String(searchParams.get("email") || "").trim().toLowerCase();
    if (urlEmail && urlEmail.includes("@")) {
      setRestoreEmail(urlEmail);
      return;
    }

    try {
      const saved = String(localStorage.getItem(EMAIL_KEY) || localStorage.getItem("userEmail") || "").trim();
      if (saved && saved.includes("@")) setRestoreEmail(saved.toLowerCase());
    } catch {
      // ignore
    }
  }, [searchParams]);

  // ✅ NEW: checkout URL can prefill Stripe email if user typed one (or it was prefilled)
  const checkoutUrl = useMemo(() => {
    const base = STRIPE_LINKS[selectedPlan];
    const email = String(restoreEmail || "").trim().toLowerCase();

    if (!email || !email.includes("@")) return base;

    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}prefilled_email=${encodeURIComponent(email)}`;
  }, [selectedPlan, restoreEmail]);

  const { label: risk, tone } = riskFromScore(ctx.score);
  const tc = toneClasses(tone);

  const copy = useMemo(() => stepCopy(ctx.score, ctx.weakDomain, ctx.userState), [ctx.score, ctx.weakDomain, ctx.userState]);

  const progressToPass = useMemo(() => {
    // visual progress towards PASSING_SCORE, capped
    const pct = (ctx.score / PASSING_SCORE) * 100;
    return clamp(Math.round(pct), 0, 100);
  }, [ctx.score]);

  // ✅ NEW: risk-based sticky CTA text
  const stickyCtaText = useMemo(() => {
    if (risk === "HIGH") return "Unlock Fix Plan (fastest path) →";
    if (risk === "ELEVATED") return "Unlock Fix Plan (push to 80%) →";
    return "Unlock Final Sweep Plan →"; // CLEAR
  }, [risk]);

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
        try {
          localStorage.setItem(EMAIL_KEY, email);
          localStorage.setItem("userEmail", email);
          localStorage.setItem(ACCESS_KEY, result.access);
        } catch {
          // ignore
        }

        setIsRestoring(false);
        router.push("/profile");
        return;
      }

      setRestoreMsg("We couldn’t find that email. If you just purchased, check your inbox for the access link.");
      setIsRestoring(false);
    } catch {
      setRestoreMsg("We couldn’t find that email. If you just purchased, check your inbox for the access link.");
      setIsRestoring(false);
    }
  };

  const ValueChip = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">
    {children}
  </span>
);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-10">
        {/* HEADER / HOOK */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-7">
          <div className="flex flex-nowrap justify-center gap-1.5 mb-4">
  <ValueChip>Secure checkout</ValueChip>
  <ValueChip>Instant access</ValueChip>
  <ValueChip>Pass Guarantee</ValueChip>
</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${tc.pill} text-[10px] font-black uppercase tracking-widest mb-4`}>
            ⚠️ Diagnostic Result • {ctx.userState} • {classLabel(ctx.license)}
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-3">
            {copy.headline} <span className="text-amber-500">Unlock your Fix Plan.</span>
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed">{copy.sub}</p>

          {/* Score + Progress */}
          <div className={`mt-6 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-5 ring-1 ${tc.ring}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Readiness</div>
                <div className="text-2xl font-black">
                  {ctx.score}% <span className={`text-sm ${tc.big}`}>({risk})</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weak domain</div>
                <div className="text-sm font-black text-white">{ctx.weakDomain}</div>
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
              <span>Target: {PASSING_SCORE}%</span>
            </div>
          </div>

          {/* Personalization strip */}
          <div className="mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Config: {ctx.userState} • {classLabel(ctx.license)} • Endorsements: {formatEndorsements(ctx.endorsements)}
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
        <div ref={topCtaRef} className="space-y-4 mb-10">
          {/* Lifetime */}
          <button
            onClick={() => setSelectedPlan("lifetime")}
            className={`relative w-full p-5 rounded-3xl border-2 text-left transition-all group ${
              selectedPlan === "lifetime"
                ? "bg-amber-500/10 border-amber-500 shadow-[0_0_34px_rgba(245,158,11,0.18)]"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
            aria-label="Select Pass Guarantee plan"
          >
            {selectedPlan === "lifetime" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
                Recommended • Best value
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
                    <span className="font-black">Guarantee:</span> If you don’t pass after completing the Fix Plan, request a refund.
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
            aria-label="Select Practice Pass monthly plan"
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
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* TRUST FOOTER */}
        <div className="mb-10 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur p-6 text-left">
          <div className="text-xs font-black uppercase tracking-widest text-slate-300 mb-2">What happens after checkout?</div>
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <div className="flex gap-3">
              <span className="text-emerald-400 font-black">✓</span>
              <span>
                You get instant access to the simulator + your Fix Plan for <span className="font-bold text-white">{ctx.userState}</span>.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-400 font-black">✓</span>
              <span>
                Your plan focuses on <span className="font-bold text-white">{ctx.weakDomain}</span> first—fastest score lift.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-400 font-black">✓</span>
              <span>You can restore access anytime using your email (no password needed).</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            <span>🔒 Secure checkout</span>
            <span>Instant access</span>
          </div>

          <div className="mt-4 text-center">
            <button onClick={() => router.push("/sim")} className="text-xs text-slate-500 underline hover:text-slate-300">
              Back to diagnostic
            </button>
          </div>
        </div>

        {/* RESTORE */}
        <div className="mt-10 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Restore access</h4>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Already paid?</span>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter purchase email"
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
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="text-xs text-amber-300 mt-3">
                {restoreMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-500 font-mono mt-4">
            If you just purchased, check your email for your access link (sometimes in Promotions/Spam).
          </p>
        </div>

        <div className="h-10" />
      </main>

      {/* STICKY CHECKOUT CTA */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-white/5 z-50"
          >
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Selected: {PRICING[selectedPlan].title}
                  </div>
                  <div className="text-xs text-slate-500">{selectedPlan === "lifetime" ? "One-time payment • Lifetime access" : "Monthly • Cancel anytime"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white">
                    ${PRICING[selectedPlan].price.toFixed(2)}
                    <span className="text-xs text-slate-500"> {selectedPlan === "lifetime" ? "" : PRICING[selectedPlan].cadence}</span>
                  </div>
                </div>
              </div>

              <a
                href={checkoutUrl}
                onClick={() => {
                  try {
                    const email = String(restoreEmail || "").trim().toLowerCase();
                    if (email && email.includes("@")) {
                      localStorage.setItem(EMAIL_KEY, email);
                      localStorage.setItem("userEmail", email);
                    }
                  } catch {
                    // ignore
                  }
                }}
                className={`block w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-lg text-center uppercase tracking-widest transition-transform active:scale-95 ${tc.glow}`}
              >
                {stickyCtaText}
              </a>

              <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-2 font-mono uppercase tracking-widest">
                <span>🔒 Secure checkout</span> • <span>Instant access</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
