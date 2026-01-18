// app/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// -------------------- CONSTANTS --------------------
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
] as const;

type LicenseClass = "A" | "B" | "C" | "D";
type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger";

// Config storage (new) + legacy keys (existing app)
const STORAGE_KEY = "haulOS.config.v1";
type StoredConfig = {
  license: LicenseClass;
  endorsements: Endorsement[];
  userState: string;
  updatedAt: number;
};

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// -------------------- COMPONENT --------------------
export default function Home() {
  const router = useRouter();
  const configuratorRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);

  // Personalization
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");

  // UI
  const [stickyCtaVisible, setStickyCtaVisible] = useState(true);

  useEffect(() => setMounted(true), []);

  // Restore persisted config (safe)
  useEffect(() => {
    if (!mounted) return;

    const saved = safeParseJSON<StoredConfig>(localStorage.getItem(STORAGE_KEY));
    if (saved?.license) setLicense(saved.license);
    if (Array.isArray(saved?.endorsements)) setEndorsements(saved.endorsements);
    if (typeof saved?.userState === "string") setUserState(saved.userState);

    // Legacy keys support (migration)
    const legacyLicense = localStorage.getItem("userLevel") as LicenseClass | null;
    const legacyEnd = safeParseJSON<Endorsement[]>(localStorage.getItem("userEndorsements"));
    const legacyState = localStorage.getItem("userState");

    if (legacyLicense && ["A", "B", "C", "D"].includes(legacyLicense)) setLicense(legacyLicense);
    if (legacyEnd && Array.isArray(legacyEnd)) setEndorsements(legacyEnd);
    if (legacyState) setUserState(legacyState);
  }, [mounted]);

  // Persist on every change
  useEffect(() => {
    if (!mounted) return;

    const payload: StoredConfig = {
      license,
      endorsements,
      userState,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Keep legacy keys updated for /sim and other pages
    localStorage.setItem("userLevel", license);
    localStorage.setItem("userEndorsements", JSON.stringify(endorsements));
    localStorage.setItem("userState", userState);
  }, [mounted, license, endorsements, userState]);

  // Sticky CTA (hide when near configurator)
  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const el = configuratorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const near = rect.top < 220 && rect.bottom > 220;
      setStickyCtaVisible(!near);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  const estimatedSalary = useMemo(() => {
    // Labeled as estimate only — keep it simple + motivating
    let base = 45000;
    if (license === "A") base += 25000;
    if (license === "B") base += 10000;

    if (endorsements.includes("Hazmat")) base += 12000;
    if (endorsements.includes("Tanker")) base += 8000;
    if (endorsements.includes("Doubles/Triples")) base += 15000;
    if (endorsements.includes("Air Brakes")) base += 2000;
    if (endorsements.includes("Passenger")) base += 5000;

    return base.toLocaleString();
  }, [license, endorsements]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const startDiagnostic = () => {
    router.push("/sim");
  };

  const scrollToConfigurator = () => {
    configuratorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const badge = (text: string) => (
    <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
      {text}
    </span>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      {/* Background FX (minimalist grid + soft glows) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.22),transparent_60%)]" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-[0.10] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.90)_75%)]" />
      </div>

      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-slate-950/70 backdrop-blur border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center shadow-[0_0_18px_rgba(245,158,11,0.10)]">
              <span className="text-amber-400 font-black">H</span>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-widest uppercase">
                CDL<span className="text-amber-500">PracticeTest</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                Smart Diagnostic • Fix Plan
              </div>
            </div>
          </div>

          <button
            onClick={scrollToConfigurator}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest transition active:scale-[0.99]"
          >
            Start Free →
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-20">
        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-mono tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            Updated for 2026 • Works offline
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white leading-[0.95] mb-4">
            CDL Practice Test that{" "}
            <span className="text-amber-500">tells you what to fix</span>
            <span className="text-white">.</span>
          </h1>

          <p className="text-slate-300/90 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-6">
            Take a 5-question diagnostic. We identify your weakest topic, then generate your personalized Fix Plan
            so you can pass your state exam faster.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {badge("No signup required")}
            {badge("Instant score")}
            {badge("State-matched wording")}
            {badge("Mobile-first")}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToConfigurator}
              className="px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest shadow-[0_0_44px_-12px_rgba(245,158,11,0.75)] transition active:scale-[0.99]"
            >
              Start Free Diagnostic →
            </button>

            <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-left max-w-sm mx-auto sm:mx-0">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                In 60 seconds you get
              </div>
              <div className="text-sm text-slate-300 mt-1">
                Weakest topic + pass roadmap preview.
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-slate-500 font-mono">
            🔒 Anonymous • No credit card required for diagnostic
          </p>
        </motion.div>

        {/* VALUE STRIP */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: "State-matched practice",
              desc: "We use your state to match DMV rules + test wording.",
              tag: "Customization",
            },
            {
              title: "Smart Fix Plan",
              desc: "Stop guessing. Train the exact domain you’re failing.",
              tag: "Efficiency",
            },
            {
              title: "Exam pressure mode",
              desc: "Timed diagnostics so test day doesn’t surprise you.",
              tag: "Confidence",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur p-5 text-left"
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 mb-2">
                {card.tag}
              </div>
              <div className="text-lg font-black tracking-tight">{card.title}</div>
              <div className="text-sm text-slate-400 mt-2 leading-relaxed">{card.desc}</div>
            </div>
          ))}
        </div>

        {/* CONFIGURATOR */}
        <motion.div
          ref={configuratorRef}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="mt-10 bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-[28px] p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

          {/* Panel Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  Build your diagnostic
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Pick your class + endorsements. We’ll customize instantly.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                  Saved automatically
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                  ~60 sec
                </span>
              </div>
            </div>
          </div>

          {/* STEP 1 */}
          <div className="mb-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                Step 1: CDL class
              </label>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                Not sure? Start with <span className="text-slate-300 font-black">A</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["A", "B", "C", "D"] as LicenseClass[]).map((cls) => {
                const active = license === cls;
                const label =
                  cls === "A" ? "Combination (Semi)" :
                  cls === "B" ? "Heavy Straight" :
                  cls === "C" ? "Passenger/Hazmat" :
                  "General / Other";

                return (
                  <button
                    key={cls}
                    onClick={() => setLicense(cls)}
                    className={`relative p-4 rounded-2xl border text-left transition-all group ${
                      active
                        ? "bg-amber-500/10 border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.22)]"
                        : "bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/70"
                    }`}
                    aria-label={`Select class ${cls}`}
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
                    <div className="text-[10px] text-slate-400 mt-2 font-mono uppercase font-black tracking-widest">
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2 */}
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4 gap-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Step 2: Endorsements (optional)
              </label>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">
                  Est. earning potential
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={estimatedSalary}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-mono font-black text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded inline-block border border-emerald-400/15"
                    aria-label="Estimated salary"
                  >
                    ${estimatedSalary}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[10px] text-slate-600 font-mono mt-1">estimate only</div>
              </div>
            </div>

            <div className="space-y-2">
              {(
                ["Air Brakes", "Hazmat", "Tanker", "Doubles/Triples", "Passenger"] as Endorsement[]
              ).map((end) => {
                const active = endorsements.includes(end);
                return (
                  <button
                    key={end}
                    onClick={() => toggleEndorsement(end)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      active
                        ? "bg-slate-800/70 border-emerald-500/40"
                        : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800/30"
                    }`}
                    aria-label={`Toggle endorsement ${end}`}
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
                        <div className={`text-sm font-black ${active ? "text-white" : "text-slate-300"}`}>
                          {end}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
                          Included in your diagnostic
                        </div>
                      </div>
                    </div>

                    {active && (
                      <span className="text-[10px] text-emerald-300 font-mono tracking-widest font-black px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3 */}
          <div className="mb-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                Step 3: State
              </label>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                We match DMV rules + wording.
              </div>
            </div>

            <div className="relative">
              <select
                value={userState}
                onChange={(e) => setUserState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-2xl p-4 text-sm font-black focus:border-amber-500 focus:outline-none appearance-none cursor-pointer hover:border-slate-600 transition-colors"
                aria-label="Select state"
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
          </div>

          {/* PRIMARY CTA */}
          <button
            onClick={startDiagnostic}
            className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-widest rounded-2xl shadow-[0_0_44px_-12px_rgba(245,158,11,0.75)] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group"
            aria-label="Start free diagnostic"
          >
            <span>Start Free Diagnostic</span>
            <span className="opacity-70 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center justify-center gap-3">
              <span>🔒 Anonymous</span>
              <span className="opacity-40">•</span>
              <span>No credit card</span>
              <span className="opacity-40">•</span>
              <span>Choices saved automatically</span>
            </p>
          </div>
        </motion.div>

        {/* TRUST + FAQ */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs font-black uppercase tracking-widest text-slate-300 mb-2">
              Why this works better than random practice
            </div>
            <ul className="space-y-3 text-sm text-slate-300/90">
              <li className="flex gap-3">
                <span className="text-emerald-400 font-black">✓</span>
                <span>
                  <span className="font-black text-white">Diagnosis first:</span> find the topic you’re actually failing.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-black">✓</span>
                <span>
                  <span className="font-black text-white">Fix Plan next:</span> train the exact domain until you clear 80%+.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-black">✓</span>
                <span>
                  <span className="font-black text-white">State matched:</span> your state tunes rules + wording.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur p-6">
            <div className="text-xs font-black uppercase tracking-widest text-slate-300 mb-2">
              Quick FAQ
            </div>
            <div className="space-y-4 text-sm text-slate-300/90">
              <div>
                <div className="font-black text-white">Do I need an account?</div>
                <div className="text-slate-400 mt-1">
                  No. Your setup saves locally on your device.
                </div>
              </div>
              <div>
                <div className="font-black text-white">How long is it?</div>
                <div className="text-slate-400 mt-1">5 questions. About 60 seconds.</div>
              </div>
              <div>
                <div className="font-black text-white">Is this the official DMV test?</div>
                <div className="text-slate-400 mt-1">
                  No—this is practice designed to mirror concepts and expose weaknesses.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY MOBILE CTA */}
      <AnimatePresence>
        {mounted && stickyCtaVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-950/80 backdrop-blur border-t border-white/5"
          >
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  CDL Practice Test
                </div>
                <div className="text-xs text-slate-400">
                  5-question diagnostic • no signup
                </div>
              </div>
              <button
                onClick={scrollToConfigurator}
                className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition"
              >
                Start →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
