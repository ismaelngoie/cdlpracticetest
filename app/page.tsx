"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LicenseClass, Endorsement } from "@/lib/questions";

// --- CONSTANTS ---
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

const STORAGE_KEYS = {
  userLevel: "userLevel",
  userEndorsements: "userEndorsements",
  userState: "userState",
  // extra production keys (do not break existing pages)
  sessionId: "haul_session_id",
  firstSeenAt: "haul_first_seen_at",
  lastSeenAt: "haul_last_seen_at",
  utm: "haul_utm",
  referrer: "haul_referrer",
  lpVariant: "haul_lp_variant",
};

const ENDORSEMENT_OPTIONS: Endorsement[] = [
  "Air Brakes",
  "Hazmat",
  "Tanker",
  "Doubles/Triples",
  "Passenger",
  "School Bus",
];

function safeGet(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
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

function makeSessionId() {
  // short, readable, good enough for client-only attribution
  const a = Math.random().toString(16).slice(2, 10);
  const b = Date.now().toString(16).slice(-6);
  return `S-${a}-${b}`.toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configuratorRef = useRef<HTMLDivElement | null>(null);

  // --- State (defaults match your current flow) ---
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");

  // hydration + storage
  const [mounted, setMounted] = useState(false);
  const [hasRestoredConfig, setHasRestoredConfig] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Session + attribution (production-ready, zero backend)
    const existingSession = safeGet(STORAGE_KEYS.sessionId);
    if (!existingSession) safeSet(STORAGE_KEYS.sessionId, makeSessionId());

    const firstSeen = safeGet(STORAGE_KEYS.firstSeenAt);
    if (!firstSeen) safeSet(STORAGE_KEYS.firstSeenAt, new Date().toISOString());
    safeSet(STORAGE_KEYS.lastSeenAt, new Date().toISOString());

    const ref = document.referrer || "";
    if (ref && !safeGet(STORAGE_KEYS.referrer)) safeSet(STORAGE_KEYS.referrer, ref);
  }, []);

  // Capture UTMs once (works for Google Ads / keyword LP)
  useEffect(() => {
    if (!mounted) return;

    const utm_source = searchParams.get("utm_source") || "";
    const utm_medium = searchParams.get("utm_medium") || "";
    const utm_campaign = searchParams.get("utm_campaign") || "";
    const utm_term = searchParams.get("utm_term") || "";
    const utm_content = searchParams.get("utm_content") || "";
    const gclid = searchParams.get("gclid") || "";

    const hasAny =
      utm_source || utm_medium || utm_campaign || utm_term || utm_content || gclid;

    if (hasAny) {
      safeSet(
        STORAGE_KEYS.utm,
        JSON.stringify({ utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid })
      );
    }
  }, [mounted, searchParams]);

  // Restore saved config (so returning users feel “recognized”)
  useEffect(() => {
    if (!mounted || hasRestoredConfig) return;

    const savedLicense = (safeGet(STORAGE_KEYS.userLevel) as LicenseClass | null) || "A";
    const savedState = safeGet(STORAGE_KEYS.userState) || "TX";
    const savedEndorsements = safeJsonParse<Endorsement[]>(
      safeGet(STORAGE_KEYS.userEndorsements),
      []
    );

    // sanitize endorsements against the allowed list
    const cleanEndorsements = savedEndorsements.filter((e) =>
      ENDORSEMENT_OPTIONS.includes(e)
    );

    setLicense(savedLicense);
    setUserState(savedState);
    setEndorsements(Array.from(new Set(cleanEndorsements)));

    setHasRestoredConfig(true);
  }, [mounted, hasRestoredConfig]);

  // Persist config continuously (so it’s never “temporary”)
  useEffect(() => {
    if (!mounted) return;
    safeSet(STORAGE_KEYS.userLevel, license);
  }, [mounted, license]);

  useEffect(() => {
    if (!mounted) return;
    safeSet(STORAGE_KEYS.userState, userState);
  }, [mounted, userState]);

  useEffect(() => {
    if (!mounted) return;
    safeSet(STORAGE_KEYS.userEndorsements, JSON.stringify(endorsements));
  }, [mounted, endorsements]);

  // --- Salary / Value Visual (conversion UX) ---
  const estimatedSalary = useMemo(() => {
    // This is an "earning potential" motivator — not a promise.
    let base = 45000;
    if (license === "A") base += 25000;
    if (license === "B") base += 10000;
    if (license === "C") base += 4000;

    if (endorsements.includes("Hazmat")) base += 12000;
    if (endorsements.includes("Tanker")) base += 8000;
    if (endorsements.includes("Doubles/Triples")) base += 15000;
    if (endorsements.includes("Air Brakes")) base += 2000;
    if (endorsements.includes("Passenger")) base += 5000;
    if (endorsements.includes("School Bus")) base += 4000;

    return base.toLocaleString();
  }, [license, endorsements]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) =>
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const scrollToConfigurator = () => {
    configuratorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startDiagnostic = () => {
    // Ensure required keys exist for the rest of your app
    safeSet(STORAGE_KEYS.userLevel, license);
    safeSet(STORAGE_KEYS.userEndorsements, JSON.stringify(endorsements));
    safeSet(STORAGE_KEYS.userState, userState);
    safeSet("haul_diagnostic_started_at", new Date().toISOString());

    router.push("/sim");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      {/* Ambient / Futuristic Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.10] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        {/* Top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-20 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
        {/* Side glow */}
        <div className="absolute top-40 -left-40 w-[520px] h-[520px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.5),transparent_65%)]" />
        <div className="absolute bottom-10 -right-40 w-[520px] h-[520px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5),transparent_65%)]" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.85)_75%)]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-14">
        {/* HERO (matches the exact keyword intent) */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            CDL Practice Test • 2026 Mode • All 50 States
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.92] mb-3">
            CDL Practice Test
            <span className="text-amber-500">.</span>
            <span className="text-slate-300">com</span>
          </h1>

          <p className="text-slate-300/90 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Take a <span className="text-white font-bold">free 5-question diagnostic</span> that feels like test day.
            Then unlock your <span className="text-white font-bold">Fix Plan</span> + full simulator when you’re ready.
          </p>

          {/* Trust / value chips (no fake numbers) */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              ⚡ Instant Diagnostic
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🧠 Explanations + Mistake Bank
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🗺️ State Mode ({userState})
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🔒 No account needed
            </span>
          </div>

          {/* Primary CTA (scrolls to configurator) */}
          <div className="mt-7 flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={scrollToConfigurator}
              className="px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest shadow-[0_0_40px_-14px_rgba(245,158,11,0.9)] transition-transform active:scale-95"
            >
              Start CDL Diagnostic
            </button>
            <button
              onClick={() => router.push("/sim")}
              className="px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white font-black uppercase tracking-widest border border-slate-800 transition-transform active:scale-95"
              title="If you're already configured, jump straight in."
            >
              Jump In Now →
            </button>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            Takes ~60 seconds • No credit card • Works on mobile
          </div>
        </motion.div>

        {/* “What happens next” (conversion clarity) */}
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {[
            { k: "01", title: "Configure", desc: "Pick Class + endorsements + state." },
            { k: "02", title: "Diagnostic", desc: "5 questions under pressure (timer on)." },
            { k: "03", title: "Fix Plan", desc: "Unlock full simulator + weak-area plan." },
          ].map((s) => (
            <div
              key={s.k}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 tracking-widest">STEP {s.k}</span>
                <span className="text-[10px] font-mono text-amber-400 tracking-widest">HAUL-GRADE</span>
              </div>
              <div className="text-sm font-black text-white">{s.title}</div>
              <div className="text-xs text-slate-400 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Configurator */}
        <motion.div
          ref={configuratorRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900/75 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Top rail glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60" />
          {/* Corner accents */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.35),transparent_70%)] opacity-40" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),transparent_70%)] opacity-40" />

          {/* Heading inside panel */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="text-left">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Setup • Personalized CDL Mode
              </div>
              <div className="text-xl md:text-2xl font-black tracking-tight mt-1">
                Configure your test path
              </div>
              <div className="text-xs text-slate-400 mt-2 max-w-[460px] leading-relaxed">
                We save your setup automatically on this device so you can come back and continue instantly.
              </div>
            </div>

            {/* Value meter */}
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">
                Earning Potential
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={estimatedSalary}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg md:text-xl font-mono font-black text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-xl inline-block border border-emerald-400/15"
                >
                  ${estimatedSalary}
                </motion.div>
              </AnimatePresence>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                (estimate)
              </div>
            </div>
          </div>

          {/* STEP 1: LICENSE CLASS */}
          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 1: Choose License Class
            </label>

            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as LicenseClass[]).map((cls) => {
                const active = license === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setLicense(cls)}
                    className={`relative p-4 rounded-2xl border text-left transition-all group ${
                      active
                        ? "bg-amber-500/10 border-amber-500 shadow-[0_0_26px_rgba(245,158,11,0.18)]"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-3xl font-black ${
                          active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        {cls}
                      </span>

                      <div className="flex items-center gap-2">
                        {cls === "A" && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300">
                            Most Common
                          </span>
                        )}
                        {active && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 mt-2 font-bold">
                      {cls === "A" && "Combination Vehicles (Semi + Trailer)"}
                      {cls === "B" && "Heavy Straight Vehicles (Bus/Box/Dump)"}
                      {cls === "C" && "Transport / Specialty (Hazmat/Passenger)"}
                      {cls === "D" && "Standard Operator (DMV Mode)"}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-wide">
                      Optimizes your diagnostic + simulator
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: ENDORSEMENTS */}
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Step 2: Add Endorsements
              </label>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  Modules Selected
                </div>
                <div className="text-sm font-black text-white">
                  {endorsements.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {ENDORSEMENT_OPTIONS.map((end) => {
                const active = endorsements.includes(end);
                return (
                  <button
                    key={end}
                    onClick={() => toggleEndorsement(end)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      active
                        ? "bg-slate-800 border-emerald-500/40 shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                        : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800/30"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          active ? "bg-emerald-500 border-emerald-500" : "border-slate-600"
                        }`}
                      >
                        {active && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="black"
                            strokeWidth="4"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </div>

                      <div className="text-left">
                        <div className={`text-sm font-black ${active ? "text-white" : "text-slate-300"}`}>
                          {end}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                          Included in diagnostic + simulator
                        </div>
                      </div>
                    </div>

                    {active ? (
                      <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-bold">
                        ENABLED
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono tracking-wider font-bold">
                        OFF
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-slate-500 font-mono">
              Tip: turn on the endorsements you’re actually testing on — the diagnostic will target your weak areas faster.
            </div>
          </div>

          {/* STEP 3: STATE */}
          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 3: Select State
            </label>

            <div className="relative">
              <select
                value={userState}
                onChange={(e) => setUserState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-2xl p-4 text-sm font-black focus:border-amber-500 focus:outline-none appearance-none cursor-pointer hover:border-slate-600 transition-colors"
              >
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                ▼
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 font-mono">
              State mode helps your practice feel like your DMV wording + rules.
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={startDiagnostic}
            className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-wider rounded-2xl shadow-[0_0_46px_-14px_rgba(245,158,11,0.85)] transition-transform active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>Start Free Diagnostic (5 Questions)</span>
            <span className="opacity-70 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Trust microcopy */}
          <div className="mt-5 text-center">
            <p className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-400">●</span> Auto-saves progress
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-amber-400">●</span> No credit card
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-slate-300">●</span> Mobile-first
              </span>
            </p>
          </div>
        </motion.div>

        {/* Mobile sticky helper CTA (conversion boost) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
          <button
            onClick={startDiagnostic}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            Start Diagnostic
          </button>
          <div className="text-center text-[10px] text-slate-500 font-mono mt-2">
            5 questions • ~60 seconds • no account
          </div>
        </div>
      </div>
    </main>
  );
}
