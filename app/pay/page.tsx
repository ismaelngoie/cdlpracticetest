"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// --- CONFIG ---
type PlanKey = "monthly" | "lifetime";

const DRIVERS_USED = "12,000+";
const PASSING_SCORE = 80;

const PRICING = {
  monthly: {
    price: 19.95,
    cadence: "/mo",
    title: "Monthly Access",
    subtitle: "Good if you want to try it first. Cancel anytime.",
    features: [
      "Unlimited CDL Practice Tests",
      "4,000 Real Questions & Answers",
      "Full Simulator of Real Exam Access",
      "All 50 States Included",
      "Works Offline (Study at rest stops)",
    ],
    cta: "START MONTHLY ACCESS",
  },
  lifetime: {
    price: 69.0,
    cadence: "one-time",
    title: "Lifetime Access",
    subtitle: "Best value. Pay once. Use forever.",
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
    cta: "GET LIFETIME ACCESS",
  },
} as const;

const CONFIG_KEY = "haulOS.config.v1";

// local storage keys for entitlement + billing email
const ACCESS_KEY = "haulOS.access.v1"; // "subscription" | "lifetime"
const EMAIL_KEY = "haulOS.email.v1"; // purchase/billing email

type UserContext = {
  score: number;
  weakDomain: string;
  userState: string; // "TX"
  license: string; // "A"
  endorsements: string[];
  sessionId: string;
};

// --- TYPES FOR MISSED QUESTIONS ---
type DiagnosticAnswer = {
  id: number;
  category: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  text: string;
  options: string[];
  explanation: string;
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

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function stateFullName(code: string) {
  const c = String(code || "").toUpperCase();
  return STATE_NAMES[c] || c || "Your State";
}

function riskFromScore(score: number) {
  if (score >= PASSING_SCORE) return { label: "READY", tone: "emerald" as const };
  if (score >= 60) return { label: "RISK", tone: "amber" as const };
  return { label: "FAIL", tone: "red" as const };
}

function toneClasses(tone: "emerald" | "amber" | "red") {
  if (tone === "emerald")
    return {
      ring: "ring-emerald-500/20",
      pill: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      big: "text-emerald-300",
      bar: "bg-emerald-500",
      glow: "shadow-[0_0_40px_-16px_rgba(16,185,129,0.55)]",
      danger: "text-emerald-300",
      dangerBg: "bg-emerald-500/10 border-emerald-500/20",
    };
  if (tone === "amber")
    return {
      ring: "ring-amber-500/20",
      pill: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      big: "text-amber-300",
      bar: "bg-amber-500",
      glow: "shadow-[0_0_40px_-16px_rgba(245,158,11,0.55)]",
      danger: "text-amber-300",
      dangerBg: "bg-amber-500/10 border-amber-500/20",
    };
  return {
    ring: "ring-red-500/20",
    pill: "bg-red-500/10 border-red-500/30 text-red-300",
    big: "text-red-300",
    bar: "bg-red-500",
    glow: "shadow-[0_0_40px_-16px_rgba(239,68,68,0.55)]",
    danger: "text-red-300",
    dangerBg: "bg-red-500/10 border-red-500/20",
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
      existing.addEventListener("error", () => reject(new Error("Failed to load payment system")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load payment system"));
    document.head.appendChild(s);
  });
}

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("monthly");

  const [ctx, setCtx] = useState<UserContext>({
    score: 42,
    weakDomain: "General Knowledge",
    userState: "TX",
    license: "A",
    endorsements: [],
    sessionId: "S-000000",
  });

  // Restore (de-emphasized but available)
  const [restoreEmail, setRestoreEmail] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [showRestore, setShowRestore] = useState(false);

  // Checkout (Embedded) UX
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const embeddedRef = useRef<any>(null);
  const checkoutSectionRef = useRef<HTMLDivElement | null>(null);
  const [embedParams, setEmbedParams] = useState<{ plan: PlanKey; email?: string } | null>(null);

  // Missed Question List & Perfect Score State
  const [missedList, setMissedList] = useState<DiagnosticAnswer[]>([]);
  const [isPerfectScore, setIsPerfectScore] = useState(false);

  // Restore user info
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

    // session id (nice for the card)
    const sid = String(localStorage.getItem("haul_session_id") || "").trim();
    const sessionId = sid
      ? sid
      : (() => {
          const a = Math.random().toString(16).slice(2, 10);
          const b = Date.now().toString(16).slice(-6);
          const gen = `S-${a}-${b}`.toUpperCase();
          try {
            localStorage.setItem("haul_session_id", gen);
          } catch {}
          return gen;
        })();

    setCtx({
      score: Number.isFinite(s) ? clamp(s, 0, 100) : 42,
      weakDomain,
      userState,
      license,
      endorsements,
      sessionId,
    });

    // Load questions (With Fallback for 100% Score)
    try {
      const raw = localStorage.getItem("haul_diagnostic_answers");
      if (raw) {
        const parsed = JSON.parse(raw) as DiagnosticAnswer[];
        if (Array.isArray(parsed) && parsed.length) {
          // 1. Try to get wrong answers
          let wrong = parsed.filter((a) => !a.isCorrect);
          
          // 2. If no wrong answers (100% score)
          if (wrong.length === 0) {
             setIsPerfectScore(true);
             // Show first 3 correct answers as samples
             wrong = parsed.slice(0, 3);
          } else {
             setIsPerfectScore(false);
          }

          setMissedList(wrong.slice(0, 3));
        }
      }
    } catch {}
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

  const stateName = useMemo(() => stateFullName(ctx.userState), [ctx.userState]);

  const progressToPass = useMemo(() => {
    const pct = (ctx.score / PASSING_SCORE) * 100;
    return clamp(Math.round(pct), 0, 100);
  }, [ctx.score]);

  const failGap = useMemo(() => Math.max(0, PASSING_SCORE - ctx.score), [ctx.score]);

  const heroLine = useMemo(() => {
    if (ctx.score >= PASSING_SCORE) {
      return `You’re at ${ctx.score}%. You can pass in ${stateName}. Now lock it in.`;
    }
    return `Your score is ${ctx.score}%. You need ${PASSING_SCORE}% to pass in ${stateName}.`;
  }, [ctx.score, stateName]);

  const scaryLine = useMemo(() => {
    if (ctx.score >= PASSING_SCORE) return "You’re close. Don’t risk it. Get consistent before test day.";
    return "If you take the test today, you’re likely to fail.";
  }, [ctx.score]);

  const stickyCtaText = useMemo(() => {
    return selectedPlan === "lifetime" ? PRICING.lifetime.cta : PRICING.monthly.cta;
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

  const startCheckout = () => {
    setCheckoutErr("");

    const e = String(restoreEmail || "").trim().toLowerCase();
    const email = e.includes("@") ? e : undefined;
    if (email) persistEmail(email);

    if (!stripePk) {
      setCheckoutErr("Payment system not ready. Missing publishable key.");
      setCheckoutOpen(true);
      setCheckoutBusy(false);
      setEmbedParams(null);
      return;
    }

    setCheckoutBusy(true);
    setCheckoutOpen(true);
    setEmbedParams({ plan: selectedPlan, email });

    // scroll into view for mobile + desktop
    setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Desktop: show embedded checkout in the right column (trust/product feel)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) return;

    if (!stripePk) return;

    const e = String(restoreEmail || "").trim().toLowerCase();
    const email = e.includes("@") ? e : undefined;
    if (email) persistEmail(email);

    setCheckoutErr("");
    setCheckoutOpen(true);
    setCheckoutBusy(true);

    setEmbedParams((prev) => {
      if (prev?.plan === selectedPlan && prev?.email === email) return prev;
      return { plan: selectedPlan, email };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, restoreEmail, stripePk]);

  // Mount embedded checkout (inline)
  useEffect(() => {
    let cancelled = false;

    async function mountEmbedded(plan: PlanKey, email?: string) {
      try {
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
        if (!stripe) throw new Error("Payment system failed to initialize.");

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
        setCheckoutErr(err?.message || "Could not load secure payment.");
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
      setRestoreMsg("Enter a valid email.");
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

      setRestoreMsg("Email not found. Try the email you used at payment.");
      setIsRestoring(false);
    } catch {
      setRestoreMsg("Email not found. Try the email you used at payment.");
      setIsRestoring(false);
    }
  };

  const ValueChip = ({ children }: { children: React.ReactNode }) => (
    <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">
      {children}
    </span>
  );

  const testimonials = [
    {
      name: "Jose M.",
      state: "Texas",
      quote: "Simple. I did practice every day. I passed first try.",
      tag: "Passed first try",
    },
    {
      name: "Abdi A.",
      state: "Florida",
      quote: "The simulator felt like the real test. It helped me a lot.",
      tag: "Felt like real test",
    },
    {
      name: "Maria L.",
      state: "California",
      quote: "I was failing. This showed me what to study. I passed.",
      tag: "Fixed weak topics",
    },
  ];

  const faqs = [
    {
      q: "Does it work for my state?",
      a: "Yes. All 50 states are included.",
    },
    {
      q: "Can I use it on my phone?",
      a: "Yes. Mobile-first. Works great on iPhone and Android.",
    },
    {
      q: "What if I don’t pass?",
      a: "If you don’t pass after using the app, you get a 100% full refund.",
    },
  ];

  // --- SUB COMPONENTS FOR MISSED ---
  const MissedCard = ({ item }: { item: DiagnosticAnswer }) => {
    const correctLetter = String.fromCharCode(65 + item.correctIndex);
    const userLetter = item.selectedIndex >= 0 ? String.fromCharCode(65 + item.selectedIndex) : "-";
    const isCorrect = item.isCorrect;

    return (
      <div className="bg-[#0B1022] border border-white/10 rounded-2xl p-5 mb-4 shadow-xl">
        {/* Dynamic Header: "ANALYSIS LOCKED" if perfect, "YOU MISSED THIS" if wrong */}
        <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isCorrect ? "text-emerald-400" : "text-amber-400"}`}>
          {isCorrect ? `ANALYSIS LOCKED • ${item.category.toUpperCase()}` : `YOU MISSED THIS • ${item.category.toUpperCase()}`}
        </div>
        
        <div className="text-sm font-bold text-white leading-relaxed mb-4">
          {item.text}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">CORRECT</div>
            <div className="text-2xl font-black text-emerald-300">{correctLetter}</div>
          </div>
          {/* Dynamic Box: Green if correct, Red if wrong */}
          <div className={`border rounded-xl p-3 ${isCorrect ? "bg-emerald-900/20 border-emerald-500/20" : "bg-red-900/20 border-red-500/20"}`}>
            <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>YOU PICKED</div>
            <div className={`text-2xl font-black ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>{userLetter}</div>
          </div>
        </div>

        {/* LOCKED ANSWER BUTTON WITH TRANSPARENT TEXT EFFECT */}
        <button 
          onClick={startCheckout}
          className="w-full relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-0 text-left transition-all hover:border-white/20 group"
        >
           {/* Faint text in background to simulate "showing the answer" */}
           <div className="absolute inset-0 p-4 text-[10px] text-slate-500 opacity-60 blur-[2px] select-none leading-relaxed">
              The correct answer is {correctLetter} because {item.explanation.slice(0, 100)}... this is the hidden rationale content that you are paying to see...
           </div>

           {/* The foreground content */}
           <div className="relative z-10 flex h-14 items-center justify-center gap-3 bg-black/30 backdrop-blur-[1px]">
              <span className="text-lg">🔒</span>
              <div className="text-left">
                 <div className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
                    UNLOCK EXPLANATIONS + UNLIMITED PRACTICE →
                 </div>
                 <div className="text-[9px] text-slate-300 font-medium">
                    Get unlimited CDL practice tests
                 </div>
              </div>
           </div>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-32 selection:bg-amber-500/20">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <main className="relative z-10 w-full px-4 lg:px-10 pt-10">
        <div className="mx-auto w-full max-w-screen-2xl">
          {/* HERO */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              <ValueChip>{DRIVERS_USED} drivers used this</ValueChip>
              <ValueChip>All 50 states</ValueChip>
              <ValueChip>Works offline</ValueChip>
              <ValueChip>Pass Guarantee</ValueChip>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-3">
              DON'T FAIL YOUR <span className="text-amber-500">CDL TEST</span>.
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
              {heroLine}{" "}
              <span className={`font-black ${tc.danger} ${ctx.score < PASSING_SCORE ? "underline" : ""}`}>{scaryLine}</span>
            </p>

            {/* Big warning line */}
            {ctx.score < PASSING_SCORE ? (
              <div
                className={`mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${tc.dangerBg} text-[12px] font-black uppercase tracking-widest`}
              >
                ⚠️ You are {failGap}% away from passing • Target is {PASSING_SCORE}% • {stateName}
              </div>
            ) : (
              <div
                className={`mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${tc.dangerBg} text-[12px] font-black uppercase tracking-widest`}
              >
                ✅ You are at {ctx.score}% • Keep it consistent • {stateName}
              </div>
            )}
          </motion.div>

          {/* Layout: full screen on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT: personalization + story + FAQ */}
            <div className="lg:col-span-7">
              {/* Driver Profile Card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-6">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.25),transparent_55%)]" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">CDL Pass Card</div>
                        <div className="mt-1 text-xl font-black tracking-tight">
                          {classLabel(ctx.license)} • {stateName}
                        </div>
                        <div className="mt-1 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                          Driver ID: {ctx.sessionId.slice(0, 14)}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 px-3 py-2 rounded-2xl border ${tc.pill} text-[10px] font-black uppercase tracking-widest`}
                      >
                        {risk === "READY" ? "READY" : `${risk} RISK`}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Score</div>
                        <div className={`mt-1 text-3xl font-black ${tc.big}`}>{ctx.score}%</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Need to Pass</div>
                        <div className="mt-1 text-3xl font-black text-white">{PASSING_SCORE}%</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weak Topic</div>
                        <div className="mt-2 text-sm font-black text-white leading-snug">{ctx.weakDomain}</div>
                      </div>
                    </div>

                    <div className="mt-5">
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

                    <div className="mt-4 text-[11px] text-slate-400">
                      <span className="font-black text-white">Endorsements:</span> {formatEndorsements(ctx.endorsements)}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* WHAT YOU MISSED SECTION (FIXED: Dynamic Header for 100% Score) */}
              {missedList.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4 px-1">
                    <div className="text-xs font-black uppercase tracking-widest text-white">
                      {isPerfectScore ? "FULL EXAM ANALYSIS" : "What You Missed"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">TAP TO UNLOCK</div>
                  </div>
                  
                  {missedList.map((missed) => (
                    <MissedCard key={missed.id} item={missed} />
                  ))}

                  <button 
                    onClick={startCheckout}
                    className="w-full py-4 rounded-xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.15)]"
                  >
                    UNLOCK EXPLANATIONS + UNLIMITED PRACTICE <span className="text-lg">→</span>
                  </button>
                  <div className="mt-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Unlimited CDL Practice Tests • All 50 States • Works Offline • 12,000+ Drivers
                  </div>
                </div>
              )}

              {/* Simple “How this helps” */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { k: "1", t: "Practice", d: "6,000+ Real exam questions and answers." },
                  { k: "2", t: "Fast Track", d: "We focus on what you miss." },
                  { k: "3", t: "Simulator", d: "Train like the real exam." },
                ].map((s) => (
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

              {/* Testimonials (must be above plans) */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6 mb-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-300">
                      Why {DRIVERS_USED} drivers use our practice tests
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Simple practice. Real questions. Pass faster.</div>
                  </div>
                  <div className="px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                    Pass Guarantee
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {testimonials.map((t) => (
                    <div key={t.name} className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2">{t.tag}</div>
                      <div className="text-sm text-white font-black leading-snug">“{t.quote}”</div>
                      <div className="mt-3 text-[11px] text-slate-400 font-mono">
                        — {t.name} • {t.state}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6 mb-3">
                <div className="text-xs font-black uppercase tracking-widest text-slate-300 mb-4">Quick FAQ</div>
                <div className="space-y-4">
                  {faqs.map((f) => (
                    <div key={f.q} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="font-black text-white">{f.q}</div>
                      <div className="mt-1 text-sm text-slate-400">{f.a}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restore (hidden by default, small link) */}
              <div className="mt-2">
                <button
                  onClick={() => setShowRestore((p) => !p)}
                  className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
                >
                  Already paid? Restore access
                </button>

                <AnimatePresence>
                  {showRestore && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-slate-300">Restore access</div>
                      <div className="text-[11px] text-slate-500 mt-1">Restore access with your payment email.</div>

                      <div className="mt-4 flex gap-2">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: Plans + Checkout */}
            <div className="lg:col-span-5">
              {/* Plans */}
              <div className="space-y-4 mb-6">
                {/* Lifetime */}
                <button
                  onClick={() => setSelectedPlan("lifetime")}
                  className={`relative w-full p-5 rounded-3xl border-2 text-left transition-all ${
                    selectedPlan === "lifetime"
                      ? "bg-amber-500/10 border-amber-500 shadow-[0_0_34px_rgba(245,158,11,0.18)]"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                  aria-label="Select lifetime access"
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
                          <span className="font-black">Guarantee:</span> If you don’t pass after using the app, you get a{" "}
                          <span className="font-black">100% full refund</span>.
                        </div>

                        <div className="text-[11px] text-slate-400 font-black mt-3">🔒 Secure Payment • 100% Money-Back Guarantee</div>
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
                  aria-label="Select monthly access"
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
                        <div className="text-[11px] text-slate-400 font-black mt-3">🔒 Secure Payment • 100% Money-Back Guarantee</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Inline Checkout (full-screen height on desktop) */}
              <AnimatePresence>
                {checkoutOpen && (
                  <motion.div
                    ref={checkoutSectionRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 text-left flex flex-col lg:sticky lg:top-6 lg:h-[calc(100vh-48px)]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Get instant access to{" "}
                          <span className="text-white font-black">{selectedPlan === "lifetime" ? "6,000+" : "4,000"}</span>{" "}
                          real questions & answers + full simulator.
                        </div>
                        <div className="mt-2 text-[11px] text-amber-300 font-black">✅ Trusted by {DRIVERS_USED} drivers</div>
                      </div>

                      <button
                        onClick={closeCheckout}
                        className="shrink-0 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10"
                        aria-label="Close checkout"
                      >
                        Close
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col gap-3">
                      {checkoutErr ? <div className="text-xs text-red-300">{checkoutErr}</div> : null}
                      {checkoutBusy ? <div className="text-xs text-slate-400">Loading secure payment…</div> : null}

                      {/* ✅ Desktop fix: make the embed region scrollable so nothing gets clipped */}
                      <div className="flex-1 min-h-[560px] lg:min-h-0 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-auto overscroll-contain">
                        <div id="embedded-checkout" className="min-h-full" />
                      </div>

                      <div className="text-[11px] text-slate-400 font-black">🔒 Secure Payment • 100% Money-Back Guarantee</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Small scarcity + CTA helper */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-black uppercase tracking-widest text-slate-300">Don’t waste your test day</div>
                <div className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Failing costs money and time. Practice now. Pass with confidence.
                </div>

                <button
                  onClick={startCheckout}
                  disabled={checkoutBusy}
                  className={`mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-lg text-center uppercase tracking-widest transition-transform active:scale-95 ${tc.glow} disabled:opacity-60`}
                >
                  {checkoutBusy ? "Opening…" : stickyCtaText}
                </button>

                <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-2 font-mono uppercase tracking-widest">
                  <span>🔒 Secure Payment</span> • <span>Pass Guarantee</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </main>

      {/* STICKY CHECKOUT CTA (mobile conversion safety net) */}
      {!checkoutOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-white/5 z-50">
          <div className="mx-auto w-full max-w-screen-2xl px-0 lg:px-6">
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
              <span>🔒 Secure Payment</span> • <span>100% Money-Back Guarantee</span>
            </p>
          </div>
        </div>
      )}
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
