// app/pay/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

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

const TESTIMONIALS = [
  {
    name: "Jose M.",
    role: "CDL Class A • Texas",
    quote: "I failed once. I used this practice tests for 5 days and passed. The questions felt the same on the real test.",
  },
  {
    name: "Amina K.",
    role: "CDL Class B • Florida",
    quote: "Simple. On my phone. I practiced at rest stops and learned fast. I passed first try.",
  },
  {
    name: "Darnell R.",
    role: "CDL • California",
    quote: "Fast Track is real. It showed what I missed and I repeated until 80%+. Passed next week.",
  },
];

const FAQ = [
  { q: "Do I need an account?", a: "No. You get instant access right after payment." },
  { q: "Does this work for my state?", a: "Yes. All 50 states are included." },
  { q: "What if I don’t pass?", a: "If you don’t pass after using the app, you get a 100% full refund." },
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

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

  // Embedded checkout state
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loadingCheckout, setLoadingCheckout] = useState<boolean>(true);
  const [checkoutError, setCheckoutError] = useState<string>("");

  // Restore UI
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const requestIdRef = useRef(0);

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

    const recommended: Plan = sc >= PASSING_SCORE ? "monthly" : "lifetime";
    if (queryPlan === "monthly" || queryPlan === "lifetime") setPlan(queryPlan);
    else setPlan(recommended);
  }, [mounted, queryPlan]);

  const stateName = useMemo(() => STATE_NAME[userState] || userState, [userState]);
  const missing = Math.max(0, PASSING_SCORE - score);
  const willFail = score > 0 && score < PASSING_SCORE;

  const headline = willFail ? "Don’t fail your CDL test." : "Pass your CDL test faster.";
  const subline =
    score > 0
      ? `Your score is ${score}%. You need ${PASSING_SCORE}% to pass in ${stateName}.`
      : `All 50 states. Full simulator. Fast Track. Offline.`;

  const checkoutHeader =
    "Complete payment below to unlock 6,000+ real Q&A, Full Simulator, Fast Track, All 50 states, Offline.";

  // Create embedded checkout session (supports either {clientSecret} or {url} response)
  useEffect(() => {
    if (!mounted) return;

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setCheckoutError("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
      setLoadingCheckout(false);
      return;
    }

    const id = ++requestIdRef.current;
    setLoadingCheckout(true);
    setCheckoutError("");
    setClientSecret("");

    const run = async () => {
      try {
        const returnUrl = `/pay?plan=${plan}`; // ensures you land back on the same plan
        const res = await fetch(`/api/checkout?plan=${plan}&embedded=1&return_url=${encodeURIComponent(returnUrl)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // Some implementations return a redirect URL instead of clientSecret.
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          // If server responds with redirect/html, just follow it.
          window.location.href = `/api/checkout?plan=${plan}`;
          return;
        }

        const data = (await res.json()) as { clientSecret?: string; url?: string; error?: string };

        if (id !== requestIdRef.current) return;

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setLoadingCheckout(false);
          return;
        }

        if (data.url) {
          window.location.href = data.url;
          return;
        }

        setCheckoutError(data.error || "Checkout could not be started.");
        setLoadingCheckout(false);
      } catch {
        if (id !== requestIdRef.current) return;
        setCheckoutError("Checkout could not be started.");
        setLoadingCheckout(false);
      }
    };

    run();
  }, [mounted, plan]);

  const pill = (text: string) => (
    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
      {text}
    </span>
  );

  const onRestore = () => {
    const val = restoreInput.trim();
    if (!val) {
      setRestoreMsg("Enter your purchase email or code.");
      return;
    }
    setRestoreMsg("Redirecting…");
    const next = `/dashboard?plan=${plan}`;
    window.location.href = `/api/login?token=${encodeURIComponent(val)}&next=${encodeURIComponent(next)}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Minimal header (no distraction) */}
      <div className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-slate-200 font-mono uppercase tracking-widest"
          >
            ← Back
          </button>

          <div className="text-xs font-black tracking-widest uppercase">
            HAUL<span className="text-amber-500">.OS</span>
          </div>

          <div className="text-xs text-slate-400 font-mono uppercase tracking-widest">
            Secure checkout
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 items-start">
          {/* RIGHT FIRST on mobile: checkout occupies screen */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Complete payment
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlan("monthly")}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition ${
                      plan === "monthly"
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                        : "bg-white/5 border-white/10 text-slate-300 hover:text-slate-100"
                    }`}
                    aria-pressed={plan === "monthly"}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPlan("lifetime")}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition ${
                      plan === "lifetime"
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                        : "bg-white/5 border-white/10 text-slate-300 hover:text-slate-100"
                    }`}
                    aria-pressed={plan === "lifetime"}
                  >
                    Lifetime
                  </button>
                </div>
              </div>

              <div className="mt-2 text-white font-black text-base leading-snug">
                {checkoutHeader}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {pill("Instant access")}
                {pill("Money-back guarantee")}
                {pill("All 50 states")}
                {pill("Works offline")}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
                <div className="w-full">
                  {/* Full focus area */}
                  <div className="h-[78vh] min-h-[620px]">
                    {loadingCheckout && (
                      <div className="h-full w-full grid place-items-center p-6">
                        <div className="text-center">
                          <div className="text-amber-400 text-3xl mb-3">⏳</div>
                          <div className="font-black">Loading secure checkout…</div>
                          <div className="mt-1 text-xs text-slate-400 font-mono uppercase tracking-widest">
                            {plan.toUpperCase()} • {classLabel(license)} • {stateName.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )}

                    {!loadingCheckout && checkoutError && (
                      <div className="h-full w-full grid place-items-center p-6">
                        <div className="text-center max-w-sm">
                          <div className="text-red-400 text-3xl mb-3">⚠️</div>
                          <div className="font-black">Checkout error</div>
                          <div className="mt-2 text-sm text-slate-300">{checkoutError}</div>
                          <button
                            onClick={() => {
                              setCheckoutError("");
                              setLoadingCheckout(true);
                              setClientSecret("");
                              // triggers effect by toggling plan twice safely
                              setPlan((p) => (p === "monthly" ? "lifetime" : "monthly"));
                              setTimeout(() => setPlan((p) => (p === "monthly" ? "lifetime" : "monthly")), 0);
                            }}
                            className="mt-4 px-4 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 active:scale-95 transition-transform"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}

                    {!loadingCheckout && !checkoutError && clientSecret && (
                      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                        <EmbeddedCheckout />
                      </EmbeddedCheckoutProvider>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                You will return to <span className="text-slate-300">/pay?plan={plan}</span> after payment
              </div>

              {/* Restore hidden by default */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowRestore((p) => !p);
                    setRestoreMsg(null);
                  }}
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
                      className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left"
                    >
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">
                        Restore on this device
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={restoreInput}
                          onChange={(e) => setRestoreInput(e.target.value)}
                          placeholder="Purchase email or code"
                          autoComplete="email"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={onRestore}
                          className="px-4 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 active:scale-95 transition-transform"
                        >
                          Restore
                        </button>
                      </div>

                      {restoreMsg && <div className="mt-2 text-[11px] text-slate-400">{restoreMsg}</div>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* LEFT: seller copy (desktop) */}
          <div className="order-2 lg:order-1 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-2">
                {headline}
              </div>
              <div className="text-sm text-slate-300/90 leading-relaxed">{subline}</div>

              {score > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
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
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                  <div className="text-red-200 font-black uppercase tracking-widest text-[11px]">
                    If you take the test today, you will FAIL.
                  </div>
                  <div className="text-red-200/80 text-[12px] mt-1">
                    You need <span className="font-black text-white">{missing}%</span> more to reach{" "}
                    <span className="font-black text-white">{PASSING_SCORE}%</span>.
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-2">What you get</div>
              <ul className="space-y-3 text-sm text-slate-300/90">
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <span className="font-black text-white">6,000+ real Q&A</span> (practice like the exam)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <span className="font-black text-white">Full Simulator</span> (repeat until 80%+)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <span className="font-black text-white">Fast Track</span> (study only what you miss)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <span className="font-black text-white">All 50 states</span> +{" "}
                    <span className="font-black text-white">Works offline</span>
                  </span>
                </li>
              </ul>

              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 leading-relaxed">
                <span className="font-black">Guarantee:</span> If you don’t pass after using the app,{" "}
                <span className="font-black">100% full refund.</span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3">Real drivers</div>
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

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3">Quick FAQ</div>
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
        </div>
      </div>
    </main>
  );
}
