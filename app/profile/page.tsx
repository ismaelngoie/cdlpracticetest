"use client";

import { useEffect, useMemo, useState } from "react";
import Dock from "@/components/Dock";
import { motion, AnimatePresence } from "framer-motion";

type ExamHistoryItem = {
  ts: number; // Date.now()
  score: number; // 0-100
  passed: boolean;
  mode: "sim" | "station";
  durationSec?: number;
  correct?: number;
  total?: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatDate(ts: number) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function shortEndorsements(endorsements: string[]) {
  const map: Record<string, string> = {
    Hazmat: "H",
    "Hazardous Materials": "H",
    Tank: "N",
    "Tank Vehicles": "N",
    Double: "T",
    Doubles: "T",
    "Doubles/Triples": "T",
    Triples: "T",
    Passenger: "P",
    "School Bus": "S",
    "Air Brakes": "A",
  };
  const letters = endorsements
    .map((e) => map[e] || e?.[0]?.toUpperCase())
    .filter(Boolean);
  return letters.join("") || "NONE";
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadExamHistory(): ExamHistoryItem[] {
  const hist = loadJson<ExamHistoryItem[]>("haul-exam-history", []);
  return Array.isArray(hist)
    ? hist
        .filter((x) => x && typeof x.ts === "number" && typeof x.score === "number")
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 12)
    : [];
}

function computeTrend(history: ExamHistoryItem[]) {
  const last3 = history.slice(0, 3);
  const prev3 = history.slice(3, 6);

  const avg = (arr: ExamHistoryItem[]) =>
    arr.length ? Math.round(arr.reduce((s, x) => s + x.score, 0) / arr.length) : 0;

  const a = avg(last3);
  const b = avg(prev3);
  const delta = a - b;

  return { recentAvg: a, priorAvg: b, delta };
}

export default function ProfilePage() {
  const [license, setLicense] = useState("A");
  const [name, setName] = useState("OPERATOR");
  const [endorsements, setEndorsements] = useState<string[]>([]);
  const [userState, setUserState] = useState("TX");

  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [arm, setArm] = useState<"locked" | "confirm">("locked");

  // IMPORTANT: do NOT touch localStorage during render (prevents Next export crash)
  const [idCode, setIdCode] = useState<string>("—");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    setLicense(localStorage.getItem("userLevel") || "A");
    setUserState(localStorage.getItem("userState") || "TX");

    setName(localStorage.getItem("userName") || "OPERATOR");

    const endRaw = localStorage.getItem("userEndorsements");
    setEndorsements(endRaw ? JSON.parse(endRaw) : []);

    setHistory(loadExamHistory());

    // Operator ID (generated client-side only)
    try {
      const existing = localStorage.getItem("haul-operator-id");
      if (existing) {
        setIdCode(existing);
      } else {
        const val = `HX-${Math.floor(10000 + Math.random() * 89999)}`;
        localStorage.setItem("haul-operator-id", val);
        setIdCode(val);
      }
    } catch {
      setIdCode("HX-00000");
    }
  }, []);

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { exams: 12, passed: 8, passRate: 67, best: 92, streak: 3, lastScore: 84 };
    }

    const exams = history.length;
    const passed = history.filter((h) => h.passed).length;
    const passRate = exams ? Math.round((passed / exams) * 100) : 0;
    const best = exams ? Math.max(...history.map((h) => h.score)) : 0;
    const lastScore = history[0]?.score ?? 0;

    let streak = 0;
    for (const h of history) {
      if (h.passed) streak += 1;
      else break;
    }

    return { exams, passed, passRate, best, streak, lastScore };
  }, [history]);

  const trend = useMemo(() => computeTrend(history), [history]);

  const readiness = useMemo(() => {
    const base = stats.passRate;
    const bestBonus = clamp(stats.best - 80, 0, 20);
    const streakBonus = clamp(stats.streak * 4, 0, 12);
    const score = clamp(Math.round(base * 0.7 + bestBonus + streakBonus), 0, 100);

    if (score >= 85)
      return {
        label: "READY",
        color: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-500/10",
        bar: "from-emerald-500 to-emerald-300",
      };
    if (score >= 70)
      return {
        label: "NEAR READY",
        color: "text-amber-400",
        border: "border-amber-500/40",
        bg: "bg-amber-500/10",
        bar: "from-amber-500 to-amber-300",
      };
    return {
      label: "IN TRAINING",
      color: "text-red-400",
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      bar: "from-red-500 to-red-300",
    };
  }, [stats]);

  const handleReconfigure = () => {
    window.location.href = "/";
  };

  const handleSubscription = () => {
    alert("Subscription portal coming soon.");
  };

  const handleFactoryReset = () => {
    if (arm === "locked") {
      setArm("confirm");
      setTimeout(() => setArm("locked"), 4500);
      return;
    }
    const ok = confirm("Factory Reset will wipe local progress on this device. Confirm?");
    if (!ok) return;
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_55%)]" />

      {/* Header */}
      <header className="px-6 pt-10 pb-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Operator Console
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Driver Logbook</h1>
            <p className="text-sm text-slate-400 font-mono mt-1">
              {userState} DMV • <span className="text-amber-400">CLASS {license}</span> • ID:{" "}
              <span className="text-slate-300">{hydrated ? idCode : "—"}</span>
            </p>
          </div>

          <div className={`shrink-0 px-3 py-2 rounded-2xl border ${readiness.border} ${readiness.bg}`}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              System Status
            </div>
            <div className={`text-sm font-black tracking-widest ${readiness.color}`}>{readiness.label}</div>
          </div>
        </div>
      </header>

      <main className="px-4 max-w-3xl mx-auto space-y-6">
        {/* CDL Card + Telemetry */}
        <div className="grid md:grid-cols-5 gap-4">
          {/* CDL Card */}
          <motion.div
            initial={{ rotateX: 60, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 110, damping: 16 }}
            className="md:col-span-3 relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.35),transparent_60%)]" />
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.7),transparent_58%)]" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/20" />

            <div className="relative text-slate-950">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    Commercial Driver License
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight">CLASS {license}</div>
                  <div className="mt-1 text-xs font-mono text-slate-700">
                    OPERATOR: <span className="font-black">{name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">EXP 2029</div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      HAUL.OS VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/40 border border-black/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1">
                    Endorsements
                  </div>
                  <div className="text-lg font-mono font-black">
                    {shortEndorsements(endorsements)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-700">
                    {endorsements.length ? endorsements.join(" • ") : "None configured"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/40 border border-black/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1">
                    Restrictions
                  </div>
                  <div className="text-lg font-mono font-black">NONE</div>
                  <div className="mt-1 text-[10px] text-slate-700">Training device profile</div>
                </div>

                <div className="rounded-2xl bg-white/40 border border-black/10 p-3 col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1">
                        Status
                      </div>
                      <div className="text-lg font-mono font-black text-emerald-700">ACTIVE</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1">
                        Last Score
                      </div>
                      <div className="text-lg font-mono font-black">{stats.lastScore}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[9px] text-slate-700/80 font-mono">
                This is a training simulation profile. Not an official DMV document.
              </div>
            </div>
          </motion.div>

          {/* Telemetry */}
          <div className="md:col-span-2 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telemetry</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${readiness.color}`}>
                  {readiness.label}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Pass Rate</span>
                    <span className="text-slate-200 font-black">{stats.passRate}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.passRate}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className={`h-full bg-gradient-to-r ${readiness.bar}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.exams}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Runs</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-emerald-400">{stats.passed}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Passed</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-amber-400">{stats.best}%</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Best</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.streak}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Streak</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Trend (Last 3)
                    </div>
                    <div
                      className={`text-xs font-black ${
                        trend.delta > 0 ? "text-emerald-400" : trend.delta < 0 ? "text-red-400" : "text-slate-400"
                      }`}
                    >
                      {trend.delta > 0 ? `+${trend.delta}` : `${trend.delta}`} pts
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Recent Avg: <span className="text-slate-200 font-black">{trend.recentAvg}%</span>{" "}
                    <span className="text-slate-600">•</span>{" "}
                    Prior: <span className="text-slate-200 font-black">{trend.priorAvg}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Actions</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleReconfigure}
                  className="rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors p-4 text-left"
                >
                  <div className="text-sm font-black text-slate-200">Reconfigure</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    Change Class
                  </div>
                </button>

                <button
                  onClick={() => (window.location.href = "/study")}
                  className="rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors p-4 text-left"
                >
                  <div className="text-sm font-black text-slate-200">Manuals</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    Study Station
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Activity</div>
              <div className="text-sm text-slate-300 mt-1">Last runs on this device</div>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {history.length ? `${history.length} records` : "No history saved yet"}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center">
                <div className="text-slate-200 font-black">Run a full simulator to generate a score report.</div>
                <div className="text-sm text-slate-500 mt-1">Your last 12 results will appear here.</div>
              </div>
            ) : (
              history.slice(0, 8).map((h, i) => (
                <motion.div
                  key={h.ts + "-" + i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          h.passed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        {h.passed ? "PASS" : "FAIL"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {h.mode === "sim" ? "Full Simulation" : "Station"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">• {formatDate(h.ts)}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-300">
                      Score: <span className="text-slate-100 font-black">{h.score}%</span>
                      {typeof h.durationSec === "number" && (
                        <>
                          <span className="text-slate-600"> • </span>
                          <span className="text-slate-400 font-mono">{formatTime(h.durationSec)}</span>
                        </>
                      )}
                      {typeof h.correct === "number" && typeof h.total === "number" && (
                        <>
                          <span className="text-slate-600"> • </span>
                          <span className="text-slate-400 font-mono">
                            {h.correct}/{h.total}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
                    <span className={`${h.passed ? "text-emerald-400" : "text-red-400"} font-black`}>
                      {h.score}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* System Controls */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">System Controls</h3>

          <button
            onClick={handleReconfigure}
            className="w-full flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm font-black text-slate-200">Reconfigure Rig (Change Class)</span>
            <span className="text-slate-500">→</span>
          </button>

          <button
            onClick={handleSubscription}
            className="w-full flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm font-black text-slate-200">Manage Subscription</span>
            <span className="text-slate-500">↗</span>
          </button>

          {/* Factory Reset (armed) */}
          <div className="rounded-2xl border border-red-900/30 bg-red-900/10 overflow-hidden">
            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-between p-5 hover:bg-red-900/15 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-black text-red-300">
                  {arm === "locked" ? "Factory Reset" : "Tap again to ARM"}
                </div>
                <div className="text-[11px] text-red-200/70 mt-0.5">Wipes local progress on this device.</div>
              </div>
              <span className={`text-red-300 ${arm === "confirm" ? "animate-pulse" : ""}`}>⚠️</span>
            </button>

            <AnimatePresence>
              {arm === "confirm" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5"
                >
                  <div className="text-[11px] text-red-200/80">
                    Safety lock active for 4.5 seconds. Tap again to proceed.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Dock />
    </div>
  );
}
