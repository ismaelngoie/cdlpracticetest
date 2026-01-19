// app/dashboard/page.tsx
"use client";

import Dock from "@/components/Dock";
import TruckSchematic from "@/components/TruckSchematic";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Keep in sync with your sim/pay config key
const CONFIG_KEY = "haulOS.config.v1";

/**
 * ✅ Google Ads purchase conversion (CDL)
 * Fires ONLY when dashboard has ?plan=monthly|lifetime
 * Uses real values (monthly: 19.95, lifetime: 69)
 * Prevents duplicates on refresh:
 *   - removes ?plan from URL after firing
 *   - sessionStorage guard if user hits the same URL again
 *
 * IMPORTANT:
 * - Set these to your CDL Google Ads values (same pattern as your NREMT setup)
 */
const GOOGLE_ADS_ID = "AW-17887232273";
const GOOGLE_ADS_CONVERSION_LABEL = "7vqPCLWfl-gbEJGCptFC"; // replace if CDL has a different label

// --- HELPERS ---
function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));
  useEffect(() => spring.set(value), [value, spring]);
  return <motion.span>{display}</motion.span>;
}

function BentoCard({
  children,
  className,
  glowColor = "amber",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "amber" | "emerald" | "red";
}) {
  const glow =
    glowColor === "emerald"
      ? "shadow-emerald-500/10 border-emerald-500/20"
      : glowColor === "red"
      ? "shadow-red-500/10 border-red-500/20"
      : "shadow-amber-500/10 border-amber-500/20";

  return (
    <div
      className={[
        "bg-slate-900/80 backdrop-blur-md border rounded-3xl relative overflow-hidden",
        glow,
        className || "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

type DriverTone = "emerald" | "amber" | "red";

function toneFromScore(score: number): { tone: DriverTone; label: string; dot: string } {
  if (score >= 80) return { tone: "emerald", label: "ALL SYSTEMS GO", dot: "bg-emerald-500" };
  if (score >= 60) return { tone: "amber", label: "STABILIZE", dot: "bg-amber-500" };
  return { tone: "red", label: "CHECK ENGINE", dot: "bg-red-500" };
}

function pillClasses(tone: DriverTone) {
  if (tone === "emerald")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (tone === "red") return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function textTone(tone: DriverTone) {
  if (tone === "emerald") return "text-emerald-300";
  if (tone === "red") return "text-red-300";
  return "text-amber-300";
}

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

type HaulConfig = {
  name?: string;
  license?: string;
  userState?: string;
  endorsements?: string[];
};

// --- MAIN ---
export default function DashboardPage() {
  const [userName, setUserName] = useState("OPERATOR");
  const [license, setLicense] = useState("A");
  const [score, setScore] = useState(0);
  const [userState, setUserState] = useState("TX");
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [salary, setSalary] = useState("75,000");
  const [endorsementsCount, setEndorsementsCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [streak, setStreak] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [lastMiss, setLastMiss] = useState<{ text: string; category: string } | null>(null);

  // ✅ Google Ads conversion:
  // Fires ONLY when dashboard has ?plan=monthly|lifetime
  // Uses real prices 19.95 / 69
  // Uses transaction_id = timestamp (Date.now())
  // Prevents duplicates on refresh:
  //   - removes ?plan from URL after firing
  //   - sessionStorage guard if user hits the same URL again
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const plan = (url.searchParams.get("plan") || "").toLowerCase();

    const PLAN_VALUE: Record<string, number> = {
      monthly: 19.95,
      lifetime: 69,
    };

    if (!(plan in PLAN_VALUE)) return;

    // ✅ session guard: prevents double-firing even if the user re-opens same URL with plan again
    const firedKey = `ads_purchase_fired_${plan}`;
    if (sessionStorage.getItem(firedKey) === "1") {
      // still clean URL so refresh doesn't show plan
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      return;
    }

    const value = PLAN_VALUE[plan];
    const transaction_id = String(Date.now());

    const w = window as any;
    w.dataLayer = w.dataLayer || [];

    const gtag =
      typeof w.gtag === "function"
        ? w.gtag
        : function () {
            w.dataLayer.push(arguments);
          };

    try {
      // robustness: ensure config exists even if init script hasn’t run yet
      gtag("config", GOOGLE_ADS_ID);

      gtag("event", "conversion", {
        send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
        value,
        currency: "USD",
        transaction_id,
      });

      sessionStorage.setItem(firedKey, "1");
    } catch {
      // if anything fails, we still clean URL below
    }

    // ✅ prevent duplicate firing on refresh: remove plan from the URL
    url.searchParams.delete("plan");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    setMounted(true);

    // Prefer unified config, fallback to legacy keys
    const saved = safeParseJSON<HaulConfig>(localStorage.getItem(CONFIG_KEY));

    const legacyLicense = localStorage.getItem("userLevel") || "A";
    const legacyState = localStorage.getItem("userState") || "TX";
    const legacyName = localStorage.getItem("userName") || "OPERATOR";

    const lvl = saved?.license || legacyLicense;
    const st = saved?.userState || legacyState;
    const nm = saved?.name || legacyName;

    const sc = parseInt(localStorage.getItem("diagnosticScore") || "45", 10);
    const wd = localStorage.getItem("weakestDomain") || "Air Brakes";

    setUserName(nm);
    setLicense(lvl);
    setUserState(st);
    setScore(Number.isFinite(sc) ? clamp(sc, 0, 100) : 45);
    setWeakDomain(wd);

    // Endorsements (prefer unified config)
    const legacyEnds = safeParseJSON<string[]>(localStorage.getItem("userEndorsements")) || [];
    const ends = Array.isArray(saved?.endorsements) ? saved!.endorsements! : legacyEnds;

    const eCount = Array.isArray(ends) ? ends.length : 0;
    setEndorsementsCount(eCount);

    // Salary estimate (simple, motivating)
    const base = lvl === "A" ? 75000 : lvl === "B" ? 60000 : 55000;
    const bump = eCount * 5000;
    setSalary((base + bump).toLocaleString());

    // Mastery (for study page progress)
    const mastered = safeParseJSON<string[]>(localStorage.getItem("mastered-ids")) || [];
    setMasteredCount(Array.isArray(mastered) ? mastered.length : 0);

    // Micro-streak: increments once/day when opening dashboard
    const today = new Date();
    const key = `haul-streak-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const last = localStorage.getItem("haul-streak-last");
    const cur = parseInt(localStorage.getItem("haul-streak") || "1", 10) || 1;

    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");

      if (last) {
        const lastDate = new Date(last);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        const next = diffDays === 1 ? cur + 1 : 1;
        localStorage.setItem("haul-streak", String(next));
        setStreak(next);
      } else {
        localStorage.setItem("haul-streak", "1");
        setStreak(1);
      }

      localStorage.setItem("haul-streak-last", today.toISOString());
    } else {
      setStreak(parseInt(localStorage.getItem("haul-streak") || "1", 10) || 1);
    }

    // Last missed item preview (premium feel)
    try {
      const raw = localStorage.getItem("diagnosticAnswers");
      if (!raw) {
        setLastMiss(null);
      } else {
        const arr = JSON.parse(raw) as Array<{ isCorrect: boolean; text: string; category: string }>;
        const miss = Array.isArray(arr) ? arr.find((a) => a && a.isCorrect === false) : null;
        setLastMiss(miss ? { text: miss.text, category: miss.category } : null);
      }
    } catch {
      setLastMiss(null);
    }
  }, []);

  const readiness = useMemo(() => toneFromScore(score), [score]);
  const themeGlow = readiness.tone;
  const toneText = textTone(readiness.tone);

  // Next action math
  const deltaToPass = Math.max(0, 80 - score);
  const etaMinutes = score >= 80 ? 12 : score >= 60 ? 18 : 25; // vibe / motivation
  const progressPct = clamp(score, 0, 100);

  // Radial graph math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPct / 100) * circumference;

  // Priority mapping: quick suggestion copy
  const priorityCopy = useMemo(() => {
    const lower = (weakDomain || "").toLowerCase();
    if (lower.includes("air")) return "Air systems are the fastest score lift. Drill rules + symptom recognition.";
    if (lower.includes("pre-trip")) return "Pre-trip is free points if you memorize the flow. Lock the sequence.";
    if (lower.includes("general")) return "General Knowledge is volume. Do rapid reps until patterns stick.";
    if (lower.includes("haz")) return "HazMat is rule-heavy. Learn the triggers, not the trivia.";
    if (lower.includes("tank")) return "Tank is physics + control. Master slosh and surge scenarios.";
    if (lower.includes("combination")) return "Combination is coupling logic. Drill kingpin + trailer dynamics.";
    return "This module is your pass blocker. Fix it first, then run full sims.";
  }, [weakDomain]);

  const missionPoints = Math.max(6, Math.min(18, deltaToPass || 8));

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-hidden font-sans">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />

      {/* Header */}
      <header className="relative z-40 px-6 pt-6 pb-3 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${readiness.dot}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Station Online</span>
            <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">•</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Streak: <span className="text-slate-300 font-bold">{streak}d</span>
            </span>
          </div>

          <h1 className="text-xl font-black text-white tracking-tighter">
            {userName} <span className="text-slate-600 mx-1">/</span> CLASS {license}
          </h1>

          <div className="mt-1 flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${pillClasses(readiness.tone)}`}>
              {readiness.label}
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              {userState} DMV • Active Modules: {endorsementsCount || 0}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Jurisdiction</div>
          <div className="text-sm font-bold text-slate-300">{userState}</div>
          <div className="mt-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Next Run: <span className="text-slate-300 font-bold">{etaMinutes} min</span>
          </div>
        </div>
      </header>

      {/* Quick CTA Strip */}
      <div className="relative z-30 px-4 max-w-xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 backdrop-blur p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Today’s Mission</div>
            <div className="text-sm font-bold text-white leading-tight">
              Raise score by <span className={toneText}>+{missionPoints} pts</span> by fixing{" "}
              <span className="text-amber-500">{weakDomain}</span>.
            </div>
            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{priorityCopy}</div>
          </div>

          <Link
            href={`/station?category=${encodeURIComponent(weakDomain)}`}
            className="shrink-0 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest shadow-[0_10px_30px_-14px_rgba(245,158,11,0.7)] active:scale-[0.98] transition-transform"
          >
            Repair Now →
          </Link>
        </div>
      </div>

      {/* Main BENTO GRID */}
      <main className="p-4 max-w-xl mx-auto relative z-10 grid grid-cols-2 gap-3 mt-2">
        {/* 1) VEHICLE DIAGNOSTICS */}
        <BentoCard className="col-span-2 p-0 h-[290px]" glowColor={themeGlow}>
          <div className="absolute top-4 left-4 z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle Diagnostics</h3>
            <p className="text-[10px] text-slate-500">Real-time telemetry • weakness mapping</p>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${pillClasses(readiness.tone)}`}>
              {readiness.label}
            </div>
          </div>

          <div className="pt-8">
            <TruckSchematic />
          </div>

          {/* subtle footer */}
          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Weak Point: <span className="text-slate-300 font-bold">{weakDomain}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Profile: <span className="text-slate-300 font-bold">Class {license}</span>
            </div>
          </div>
        </BentoCard>

        {/* 2) EXAM READINESS */}
        <BentoCard className="col-span-2 p-6 flex flex-row items-center justify-between gap-4" glowColor={themeGlow}>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Readiness</h3>
            <p className="text-[10px] text-slate-500">Based on diagnostic + recent sims</p>

            <div className="pt-2">
              <div className="text-2xl font-black text-white">
                {score >= 80 ? "PASSING" : score >= 60 ? "NEAR PASS" : "AT RISK"}
              </div>
              <div className="text-xs text-slate-400 leading-tight mt-1">
                {score >= 80 ? (
                  <>Maintain momentum: one full sim today keeps you exam-ready.</>
                ) : (
                  <>
                    You need <span className="text-white font-bold">+{deltaToPass} pts</span> to guarantee an 80%+ pass.
                  </>
                )}
              </div>

              {/* micro KPI row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Mastery</div>
                  <div className="text-lg font-mono font-black text-white">
                    {masteredCount}
                    <span className="text-slate-600 text-xs"> ids</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Fix Target</div>
                  <div className="text-lg font-mono font-black text-white">
                    {deltaToPass === 0 ? "HOLD" : `+${deltaToPass}`}
                    <span className="text-slate-600 text-xs"> pts</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">ETA</div>
                  <div className="text-lg font-mono font-black text-white">
                    {etaMinutes}
                    <span className="text-slate-600 text-xs"> min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Radial Graph */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r={radius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={mounted ? offset : circumference}
                strokeLinecap="round"
                className={`${textTone(readiness.tone)} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className={`text-2xl font-black ${textTone(readiness.tone)}`}>
                <AnimatedNumber value={progressPct} />%
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Score</span>
            </div>
          </div>
        </BentoCard>

        {/* 3) DAILY MANIFEST (Action) */}
        <BentoCard className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 p-5" glowColor="amber">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Daily Manifest</h3>
              <h2 className="text-lg font-bold text-white">
                Fix Priority: <span className="text-amber-500">{weakDomain}</span>
              </h2>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{priorityCopy}</p>
            </div>

            <div className="shrink-0">
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-right">Protocol</div>
              <div className="text-xs font-black text-slate-200 text-right">15m Fix → Full Sim</div>
            </div>
          </div>

          {/* Premium “last miss” preview */}
          {lastMiss && (
            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.25),transparent_60%)]" />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Last Failure • {lastMiss.category}
                </div>
                <div className="text-sm text-slate-200 font-semibold leading-relaxed line-clamp-2">{lastMiss.text}</div>
                <div className="mt-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Fix this and your score jumps fastest.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={`/station?category=${encodeURIComponent(weakDomain)}`}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>🛠️</span> Repair System (15m)
            </Link>

            <Link
              href="/simulator"
              className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <span>🚛</span> Run Full Exam
            </Link>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            Objective: hit 80%+ twice in a row → walk into DMV calm.
          </div>
        </BentoCard>

        {/* 4) SALARY STATS */}
        <BentoCard className="p-4 flex flex-col justify-center" glowColor="emerald">
          <div className="text-emerald-400 mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Est. Salary</div>
          <div className="text-lg font-mono font-black text-white">${salary}</div>
          <div className="mt-1 text-[10px] text-slate-500">
            Includes <span className="text-slate-200 font-bold">{endorsementsCount}</span> module bump(s)
          </div>
        </BentoCard>

        {/* 5) KNOWLEDGE BANK */}
        <BentoCard className="p-4 flex flex-col justify-center" glowColor="amber">
          <div className="text-blue-400 mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Manuals</div>
          <div className="text-lg font-mono font-black text-white">
            {Math.min(300, Math.max(12, Math.round(masteredCount / 4) + 12))}
            <span className="text-slate-600 text-xs">/300</span>
          </div>

          <Link
            href="/study"
            className="mt-3 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/50 hover:bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 transition-colors"
          >
            Open Manuals →
          </Link>
        </BentoCard>
      </main>

      <Dock />
    </div>
  );
}
