// app/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LicenseClass, Endorsement } from "@/lib/questions";

// -------------------- CONSTANTS --------------------
const CONFIG_KEY = "haulOS.config.v1";

// Legacy keys (keep /sim compatible)
const LEGACY_KEYS = {
  license: "userLevel",
  endorsements: "userEndorsements",
  userState: "userState",
} as const;

const STORAGE_KEYS = {
  sessionId: "haul_session_id",
  firstSeenAt: "haul_first_seen_at",
  lastSeenAt: "haul_last_seen_at",
  utm: "haul_utm",
  referrer: "haul_referrer",
  diagnosticStartedAt: "haul_diagnostic_started_at",
} as const;

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

// keep it exactly like your old vibe (+ school bus)
const ENDORSEMENT_OPTIONS: Endorsement[] = [
  "Air Brakes",
  "Hazmat",
  "Tanker",
  "Doubles/Triples",
  "Passenger",
  "School Bus",
];

type StoredConfig = {
  license: LicenseClass;
  endorsements: Endorsement[];
  userState: string;
  updatedAt: number;
};

// -------------------- HELPERS --------------------
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
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
function makeSessionId() {
  const a = Math.random().toString(16).slice(2, 10);
  const b = Date.now().toString(16).slice(-6);
  return `S-${a}-${b}`.toUpperCase();
}

function classDesc(cls: LicenseClass) {
  if (cls === "A") return "Combination Vehicles (Semi + Trailer)";
  if (cls === "B") return "Heavy Straight Vehicles (Bus/Box/Dump)";
  if (cls === "C") return "Transport / Specialty (Hazmat/Passenger)";
  return "Standard Operator (DMV Mode)";
}

// -------------------- PAGE --------------------
export default function Home() {
  const router = useRouter();
  const configuratorRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);

  // setup state
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");

  // UI state
  const [stickyCtaVisible, setStickyCtaVisible] = useState(true);

  useEffect(() => {
    setMounted(true);

    // session id
    const existingSession = safeGet(STORAGE_KEYS.sessionId);
    if (!existingSession) safeSet(STORAGE_KEYS.sessionId, makeSessionId());

    // timestamps
    const firstSeen = safeGet(STORAGE_KEYS.firstSeenAt);
    if (!firstSeen) safeSet(STORAGE_KEYS.firstSeenAt, new Date().toISOString());
    safeSet(STORAGE_KEYS.lastSeenAt, new Date().toISOString());

    // referrer
    const ref = document.referrer || "";
    if (ref && !safeGet(STORAGE_KEYS.referrer)) safeSet(STORAGE_KEYS.referrer, ref);

    // UTMs (no useSearchParams → avoids prerender issues)
    const sp = new URLSearchParams(window.location.search);
    const utm_source = sp.get("utm_source") || "";
    const utm_medium = sp.get("utm_medium") || "";
    const utm_campaign = sp.get("utm_campaign") || "";
    const utm_term = sp.get("utm_term") || "";
    const utm_content = sp.get("utm_content") || "";
    const gclid = sp.get("gclid") || "";
    const hasAny = utm_source || utm_medium || utm_campaign || utm_term || utm_content || gclid;
    if (hasAny) {
      safeSet(
        STORAGE_KEYS.utm,
        JSON.stringify({ utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid })
      );
    }
  }, []);

  // Restore persisted config (config key + legacy migration)
  useEffect(() => {
    if (!mounted) return;

    const saved = safeJsonParse<StoredConfig>(safeGet(CONFIG_KEY), {
      license: "A",
      endorsements: [],
      userState: "TX",
      updatedAt: 0,
    });

    // apply CONFIG_KEY first
    if (saved?.license) setLicense(saved.license);
    if (Array.isArray(saved?.endorsements)) {
      const clean = saved.endorsements.filter((e) => ENDORSEMENT_OPTIONS.includes(e));
      setEndorsements(uniq(clean));
    }
    if (typeof saved?.userState === "string") setUserState(saved.userState);

    // legacy migration (if exists, it can override)
    const legacyLicense = safeGet(LEGACY_KEYS.license) as LicenseClass | null;
    const legacyEnd = safeJsonParse<Endorsement[]>(safeGet(LEGACY_KEYS.endorsements), []);
    const legacyState = safeGet(LEGACY_KEYS.userState);

    if (legacyLicense && ["A", "B", "C", "D"].includes(legacyLicense)) setLicense(legacyLicense);
    if (Array.isArray(legacyEnd)) {
      const clean = legacyEnd.filter((e) => ENDORSEMENT_OPTIONS.includes(e));
      setEndorsements(uniq(clean));
    }
    if (legacyState) setUserState(legacyState);
  }, [mounted]);

  // Persist on every change (config key + legacy keys kept in sync)
  useEffect(() => {
    if (!mounted) return;

    const payload: StoredConfig = {
      license,
      endorsements: uniq(endorsements),
      userState,
      updatedAt: Date.now(),
    };

    safeSet(CONFIG_KEY, JSON.stringify(payload));
    safeSet(LEGACY_KEYS.license, license);
    safeSet(LEGACY_KEYS.endorsements, JSON.stringify(payload.endorsements));
    safeSet(LEGACY_KEYS.userState, userState);
  }, [mounted, license, endorsements, userState]);

  // Sticky CTA visibility (hide if near configurator CTA)
  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const el = configuratorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const near = rect.top < 260 && rect.bottom > 260;
      setStickyCtaVisible(!near);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const scrollToConfigurator = () => {
    configuratorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startDiagnostic = () => {
    safeSet(STORAGE_KEYS.diagnosticStartedAt, new Date().toISOString());
    router.push("/sim");
  };

  const estimatedSalary = useMemo(() => {
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

  const setupShort = useMemo(() => {
    const ends =
      endorsements.length > 0 ? `${endorsements.length} module${endorsements.length === 1 ? "" : "s"}` : "core";
    return `${userState} • Class ${license} • ${ends}`;
  }, [userState, license, endorsements.length]);

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      {/* Ambient / Futuristic Background (same clean vibe) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.10] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-20 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
        <div className="absolute top-44 -left-40 w-[520px] h-[520px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.5),transparent_65%)]" />
        <div className="absolute bottom-12 -right-40 w-[520px] h-[520px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.86)_75%)]" />
      </div>

      {/* Top Nav — clean “Start CDL / Takes 60 seconds” */}
      <div className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <span className="text-amber-400 font-black">⚡</span>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-widest uppercase">
                CDL<span className="text-amber-500"> Practice</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{setupShort}</div>
            </div>
          </div>

          <button
            onClick={scrollToConfigurator}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-2 text-left"
          >
            <div className="text-[11px] font-black uppercase tracking-widest">Start CDL →</div>
            <div className="text-[10px] text-slate-500 font-mono">Takes ~60 seconds</div>
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-14 pb-24">
        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            Updated for 2026 • Works offline • All 50 States
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.92] mb-3">
            CDL Practice Test<span className="text-amber-500">.</span>
            <span className="text-slate-300">com</span>
          </h1>

          <p className="text-slate-300/90 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Take a <span className="text-white font-bold">free 5-question diagnostic</span>.
            We use your state to match DMV rules + test wording — then show what to fix.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              ⚡ Instant Diagnostic
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🧠 Fix Plan Preview
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🗺️ State Mode ({userState})
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[11px] text-slate-200">
              🔒 No account needed
            </span>
          </div>

          <div className="mt-7 flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={scrollToConfigurator}
              className="px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest shadow-[0_0_40px_-14px_rgba(245,158,11,0.9)] transition-transform active:scale-95"
            >
              Start CDL Diagnostic
            </button>
            <button
              onClick={startDiagnostic}
              className="px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white font-black uppercase tracking-widest border border-slate-800 transition-transform active:scale-95"
              title="If you're already configured, jump straight in."
            >
              Jump In Now →
            </button>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 font-mono">Takes ~60 seconds • No credit card • Mobile-first</div>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {[
            { k: "01", title: "Configure", desc: "Pick class + endorsements + state." },
            { k: "02", title: "Diagnostic", desc: "5 questions under pressure (timer on)." },
            { k: "03", title: "Fix Plan", desc: "Unlock your plan + full simulator." },
          ].map((s) => (
            <div key={s.k} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 tracking-widest">STEP {s.k}</span>
                <span className="text-[10px] font-mono text-amber-400 tracking-widest">HAUL-GRADE</span>
              </div>
              <div className="text-sm font-black text-white">{s.title}</div>
              <div className="text-xs text-slate-400 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Configurator (old vibe, new storage) */}
        <motion.div
          ref={configuratorRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900/75 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60" />

          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="text-left">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Setup • Personalized CDL Mode
              </div>
              <div className="text-xl md:text-2xl font-black tracking-tight mt-1">Configure your test path</div>
              <div className="text-xs text-slate-400 mt-2 max-w-[460px] leading-relaxed">
                Why we ask: <span className="text-slate-300">We use your state to match DMV rules + test wording.</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-950/40 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  Updated for 2026
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-950/40 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  Works offline
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-950/40 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  Saved automatically
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Earning Potential</div>
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
              <div className="text-[10px] text-slate-500 mt-1 font-mono">(estimate)</div>
            </div>
          </div>

          {/* Step 1 */}
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
                      {active && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>

                    <div className="text-[11px] text-slate-300 mt-2 font-bold">{classDesc(cls)}</div>

                    <div className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-wide">
                      Optimizes your diagnostic + simulator
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Step 2: Add Endorsements
              </label>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Modules Selected</div>
                <div className="text-sm font-black text-white">{endorsements.length}</div>
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </div>

                      <div className="text-left">
                        <div className={`text-sm font-black ${active ? "text-white" : "text-slate-300"}`}>{end}</div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                          Included in diagnostic + simulator
                        </div>
                      </div>
                    </div>

                    {active ? (
                      <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-bold">ENABLED</span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono tracking-wider font-bold">OFF</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-slate-500 font-mono">
              Tip: turn on what you’re actually testing on — your diagnostic targets weak areas faster.
            </div>
          </div>

          {/* Step 3 */}
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 font-mono">
              We use your state to match DMV rules + test wording.
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

          <div className="mt-5 text-center">
            <p className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-400">●</span> Auto-saves setup
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
      </div>

      {/* Desktop “floating thing” — minimal + clean */}
      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="hidden lg:block fixed right-5 bottom-24 z-40 w-[300px]"
          >
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Live Setup</div>
                    <div className="mt-1 text-sm font-black text-white">{setupShort}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      5Q diagnostic • ~60 sec
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
                    <span className="text-amber-400 font-black">⚡</span>
                  </div>
                </div>

                <button
                  onClick={startDiagnostic}
                  className="mt-4 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition"
                >
                  Start Diagnostic →
                </button>

                <button
                  onClick={scrollToConfigurator}
                  className="mt-2 w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest active:scale-95 transition"
                >
                  Edit setup
                </button>
              </div>

              <div className="px-4 py-3 border-t border-white/5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                State matched wording.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sticky CTA */}
      <AnimatePresence>
        {mounted && stickyCtaVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-950/80 backdrop-blur-xl border-t border-white/5"
          >
            <button
              onClick={startDiagnostic}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              Start Diagnostic
            </button>
            <div className="text-center text-[10px] text-slate-500 font-mono mt-2">5 questions • ~60 seconds • no account</div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
