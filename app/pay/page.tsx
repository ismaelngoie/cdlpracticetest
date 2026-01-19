// app/pay/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

// -------------------- TYPES --------------------
type LicenseClass = "A" | "B" | "C" | "D";
type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger" | "School Bus";
type Plan = "monthly" | "lifetime";

// -------------------- STORAGE --------------------
const STORAGE_KEYS = {
  userLevel: "userLevel",
  userState: "userState",
  userEndorsements: "userEndorsements",
  diagnosticScore: "diagnosticScore",
};

// If you set this on successful payment, pay page will auto-send them to /dashboard
const ACCESS_KEY = "haulOS.access.v1"; // "paid" | "true"

// -------------------- CONSTANTS --------------------
const PASSING_SCORE = 80;

const STATE_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const LIFETIME_FEATURES = [
  "Unlimited CDL Practice Tests",
  "6,000+ Real Questions & Answers",
  "Fast Track Mode (Save Time)",
  "Full Simulator of Real Exam Access",
  "All 50 States Included",
  "Works Offline (Study at rest stops)",
  "100% Money-Back Guarantee",
];

const MONTHLY_FEATURES = [
  "Unlimited CDL Practice Tests",
  "4,000 Real Questions & Answers",
  "Full Simulator of Real Exam Access",
  "All 50 States Included",
  "Works Offline (Study at rest stops)",
];

const TESTIMONIALS = [
  {
    name: "Jose M.",
    role: "CDL Class A • Texas",
    quote:
      "I failed once. I used this practice tests for 5 days and passed. The questions felt the same on the real test.",
  },
  {
    name: "Amina K.",
    role: "CDL Class B • Florida",
    quote:
      "Simple. On my phone. I practiced at rest stops and learned fast. I passed first try.",
  },
  {
    name: "Darnell R.",
    role: "CDL • California",
    quote:
      "Fast Track is real. It showed what I missed and I repeated until 80%+. Passed next week.",
  },
];

const FAQ = [
  {
    q: "Do I need an account?",
    a: "No. You get access right after payment.",
  },
  {
    q: "Does this work for my state?",
    a: "Yes. All 50 states are included.",
  },
  {
    q: "What if I don’t pass?",
    a: "If you don’t pass after using the app, you get a 100% full refund.",
  },
];

// -------------------- SAFE STORAGE --------------------
function safeGet(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function classLabel(license: LicenseClass) {
  if (license === "A") return "Class A";
  if (license === "B") return "Class B";
  if (license === "C") return "Class C";
  return "Class D";
}
function formatEndorsements(ends: Endorsement[]) {
  if (!ends.length) return "None";
  return ends.join(", ");
}

export default function PayPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const queryPlan = (sp.get("plan") as Plan | null) || null;

  const [mounted, setMounted] = useState(false);

  const [license, setLicense] = useState<LicenseClass>("A");
  const [userState, setUserState] = useState("TX");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [score, setScore] = useState<number>(0);

  const [plan, setPlan] = useState<Plan>("lifetime");
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  // If you have actual checkout embed URLs, plug them here (optional).
  // Otherwise, use the redirect endpoints below.
  const checkoutEmbedUrl = useMemo(() => {
    const envLifetime = process.env.NEXT_PUBLIC_CHECKOUT_IFRAME_LIFETIME || "";
    const envMonthly = process.env.NEXT_PUBLIC_CHECKOUT_IFRAME_MONTHLY || "";
    if (plan === "lifetime" && envLifetime) return envLifetime;
    if (plan === "monthly" && envMonthly) return envMonthly;
    return "";
  }, [plan]);

  useEffect(() => setMounted(true), []);

  // If already paid on this device, go to dashboard immediately
  useEffect(() => {
    if (!mounted) return;
    const access = safeGet(ACCESS_KEY);
    if (access === "paid" || access === "true") {
      router.replace("/dashboard");
    }
  }, [mounted, router]);

  // Load personalization from localStorage
  useEffect(() => {
    if (!mounted) return;

    const lic = (safeGet(STORAGE_KEYS.userLevel) as LicenseClass | null) || "A";
    const st = safeGet(STORAGE_KEYS.userState) || "TX";
    const ends = safeJsonParse<Endorsement[]>(safeGet(STORAGE_KEYS.userEndorsements), []);
    const rawScore = safeGet(STORAGE_KEYS.diagnosticScore);
    const sc = rawScore ? clamp(parseInt(rawScore, 10) || 0, 0, 100) : 0;

    setLicense(lic);
    setUserState(st);
    setEndorsements(Array.from(new Set(ends)));
    setScore(sc);

    // Recommended plan: if <80, push lifetime; else monthly is ok
    const recommended: Plan = sc >= PASSING_SCORE ? "monthly" : "lifetime";

    if (queryPlan === "monthly" || queryPlan === "lifetime") setPlan(queryPlan);
    else setPlan(recommended);
  }, [mounted, queryPlan]);

  const stateName = useMemo(() => STATE_NAME[userState] || userState, [userState]);
  const missing = Math.max(0, PASSING_SCORE - score);
  const willFail = score > 0 && score < PASSING_SCORE;

  const headline = willFail ? "Don’t fail your CDL test." : "Get ready. Pass your CDL test.";
  const topLine =
    score > 0
      ? `Your score is ${score}%. You need ${PASSING_SCORE}% to pass in ${stateName}.`
      : `All 50 states. Real practice tests. Pass faster.`;

  const planFeatures = plan === "lifetime" ? LIFETIME_FEATURES : MONTHLY_FEATURES;
  const planTitle = plan === "lifetime" ? "Lifetime Access" : "Monthly Access";
  const planBadge = plan === "lifetime" ? "BEST VALUE" : "MOST FLEXIBLE";

  const checkoutHeader = "Complete payment below to unlock 6,000+ real Q&A, Full Simulator, Fast Track, All 50 states, Offline.";

  // Redirect checkout (no processor name)
  const startCheckout = async (selected: Plan) => {
    // Option A: redirect to your own API route that creates a checkout session
    // Replace these endpoints to match your backend.
    const url = selected === "lifetime" ? "/api/checkout?plan=lifetime" : "/api/checkout?plan=monthly";
    window.location.href = url;
  };

  const onRestore = async () => {
    // Keep this simple. You can connect it to your backend later.
    // For now, it just shows a message. (No “support email” anywhere.)
    const val = restoreInput.trim();
    if (!val) {
      setRestoreMsg("Enter your purchase email or code.");
      return;
    }
    setRestoreMsg("Checking…");
    // TODO: call your backend to verify and set local storage ACCESS_KEY.
    // Example:
    // const res = await fetch("/api/restore", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ token: val }) });
    // if (res.ok) { localStorage.setItem(ACCESS_KEY, "paid"); router.replace("/dashboard"); }
    setTimeout(() => {
      setRestoreMsg("If this is valid, your access will restore on this device.");
    }, 700);
  };

  const pill = (text: string) => (
    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
      {text}
    </span>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.22),transparent_60%)]" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),transparent_60%)]" />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-slate-950/70 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <span className="text-amber-400 font-black">H</span>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-widest uppercase">
                HAUL<span className="text-amber-500">.OS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                Pass Guarantee • CDL Practice Tests
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {pill("12,000+ drivers")}
            {pill("All 50 states")}
            {pill("Works offline")}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-10 pb-24">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Over 12,000+ drivers used our practice tests
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
            {headline}
          </h1>

          <p className="mt-3 text-slate-300/90 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
            {topLine}
          </p>

          {score > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-slate-200">
                {classLabel(license)} • {stateName}
              </span>
              <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-slate-200">
                Endorsements: {formatEndorsements(endorsements)}
              </span>
              <span className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11px] font-black text-amber-200">
                Score: <span className="text-white">{score}%</span>
              </span>
              <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-black text-emerald-200">
                Need: <span className="text-white">{PASSING_SCORE}%</span>
              </span>
            </div>
          )}

          {willFail && (
            <div className="mt-5 inline-block rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3">
              <div className="text-red-200 font-black uppercase tracking-widest text-[11px]">
                If you take the test today, you will FAIL.
              </div>
              <div className="text-red-200/80 text-[12px] mt-1">
                You need <span className="font-black text-white">{missing}%</span> more to reach <span className="font-black text-white">{PASSING_SCORE}%</span>.
              </div>
            </div>
          )}
        </motion.div>

        {/* 2-column desktop layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
          {/* LEFT: seller copy */}
          <div className="space-y-4">
            {/* Value bullets */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-2">
                What you get (simple)
              </div>
              <ul className="space-y-3 text-sm text-slate-300/90">
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span><span className="font-black text-white">6,000+ real Q&A</span> (practice like the exam)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span><span className="font-black text-white">Full Simulator</span> (do full tests until 80%+)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span><span className="font-black text-white">Fast Track</span> (study only what you miss)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span><span className="font-black text-white">All 50 states</span> + <span className="font-black text-white">Works offline</span></span>
                </li>
              </ul>

              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 leading-relaxed">
                <span className="font-black">Guarantee:</span> If you don’t pass after using the app, <span className="font-black">100% full refund.</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3">
                Real drivers
              </div>

              <div className="grid grid-cols-1 gap-3">
                {TESTIMONIALS.map((t) => (
                  <div key={t.name} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="text-sm text-white font-black">“{t.quote}”</div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      <span className="font-black text-slate-200">{t.name}</span> • {t.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3">
                Quick FAQ
              </div>
              <div className="space-y-4">
                {FAQ.map((f) => (
                  <div key={f.q} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="font-black text-white">{f.q}</div>
                    <div className="text-sm text-slate-400 mt-1">{f.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: plan + checkout */}
          <div className="space-y-4">
            {/* Checkout header */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-amber-300 mb-2">
                Complete payment
              </div>
              <div className="text-white font-black text-lg leading-snug">
                {checkoutHeader}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pill("Secure payment")}
                {pill("Money-back guarantee")}
                {pill("Instant access")}
              </div>
            </div>

            {/* Plan selector */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Lifetime */}
                <button
                  onClick={() => setPlan("lifetime")}
                  className={`text-left rounded-3xl border p-5 transition ${
                    plan === "lifetime"
                      ? "border-amber-500 bg-amber-500/10 shadow-[0_0_30px_-12px_rgba(245,158,11,0.55)]"
                      : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
                  }`}
                  aria-pressed={plan === "lifetime"}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-black">Lifetime Access</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mt-1">
                        BEST VALUE
                      </div>
                    </div>
                    {score > 0 && score < PASSING_SCORE && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-widest">
                        Recommended
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {LIFETIME_FEATURES.slice(0, 4).map((f) => (
                      <div key={f} className="flex gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="font-semibold">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      Tap to select
                    </div>
                  </div>
                </button>

                {/* Monthly */}
                <button
                  onClick={() => setPlan("monthly")}
                  className={`text-left rounded-3xl border p-5 transition ${
                    plan === "monthly"
                      ? "border-amber-500 bg-amber-500/10 shadow-[0_0_30px_-12px_rgba(245,158,11,0.55)]"
                      : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
                  }`}
                  aria-pressed={plan === "monthly"}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-black">Monthly Access</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mt-1">
                        MOST FLEXIBLE
                      </div>
                    </div>
                    {score > 0 && score >= PASSING_SCORE && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                        Good choice
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {MONTHLY_FEATURES.slice(0, 4).map((f) => (
                      <div key={f} className="flex gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="font-semibold">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      Tap to select
                    </div>
                  </div>
                </button>
              </div>

              {/* Selected plan details */}
              <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white">{planTitle}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mt-1">
                      {planBadge}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 text-right">
                    {classLabel(license)} • {stateName}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {planFeatures.map((b) => (
                    <div
                      key={b}
                      className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-200"
                    >
                      <span className="text-emerald-400 font-black">✓</span>{" "}
                      <span className="font-semibold">{b}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => startCheckout("lifetime")}
                    className="py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
                  >
                    GET LIFETIME ACCESS
                  </button>
                  <button
                    onClick={() => startCheckout("monthly")}
                    className="py-4 rounded-2xl bg-white hover:bg-slate-200 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
                  >
                    START MONTHLY ACCESS
                  </button>
                </div>

                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  🔒 Secure Payment • 100% Money-Back Guarantee
                </div>

                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowRestore((p) => !p)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Already paid? Restore access
                  </button>

                  <AnimatePresence>
                    {showRestore && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4"
                      >
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">
                          Restore on this device
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={restoreInput}
                            onChange={(e) => setRestoreInput(e.target.value)}
                            placeholder="Purchase email or code"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={onRestore}
                            className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-black uppercase tracking-widest text-xs"
                          >
                            Restore
                          </button>
                        </div>
                        {restoreMsg && (
                          <div className="mt-2 text-[11px] text-slate-400">{restoreMsg}</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Checkout embed (optional iframe) */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-2">
                Payment
              </div>
              <div className="text-sm text-slate-400 leading-relaxed mb-4">
                Complete payment below to get instant access.
              </div>

              {checkoutEmbedUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/30">
                  <iframe
                    title="Checkout"
                    src={checkoutEmbedUrl}
                    className="w-full h-[640px] md:h-[720px]"
                    allow="payment *"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-300">
                  <div className="font-black text-white">Checkout embed goes here.</div>
                  <div className="mt-2 text-slate-400">
                    (Optional) Set <span className="font-mono text-slate-200">NEXT_PUBLIC_CHECKOUT_IFRAME_LIFETIME</span> and{" "}
                    <span className="font-mono text-slate-200">NEXT_PUBLIC_CHECKOUT_IFRAME_MONTHLY</span>
                    <br />
                    Or use the buttons above to redirect to <span className="font-mono text-slate-200">/api/checkout</span>.
                  </div>
                </div>
              )}

              <div className="mt-3 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                🔒 Secure Payment • Pass Guarantee
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-950/85 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {score > 0 ? `Score: ${score}% • Need: ${PASSING_SCORE}%` : "CDL Practice Tests"}
            </div>
            <div className="text-xs text-slate-400">
              {score > 0 ? `${stateName} • ${classLabel(license)}` : "All 50 states • Works offline"}
            </div>
          </div>
          <button
            onClick={() => startCheckout(plan)}
            className="w-full sm:w-auto sm:min-w-[320px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95"
          >
            {plan === "lifetime" ? "GET LIFETIME ACCESS" : "START MONTHLY ACCESS"}
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          🔒 Secure Payment • 100% Money-Back Guarantee
        </div>
      </div>
    </main>
  );
}
