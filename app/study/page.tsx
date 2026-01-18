"use client";

import { useEffect, useMemo, useState } from "react";
import Dock from "@/components/Dock";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- Industrial Icon Mapping ---
const ICONS: Record<string, string> = {
  "Air Brakes": "💨",
  "Combination Vehicles": "🔗",
  "Doubles/Triples": "🚛",
  "Driving Safely": "🛡️",
  "General Knowledge": "🧠",
  "Hazardous Materials": "☢️",
  "Passenger": "👥",
  "Pre-Trip Inspection": "🔍",
  "School Bus": "🚸",
  "Tank Vehicles": "💧",
  "Transporting Cargo": "📦",
  "Vehicle Control": "⚙️",
  "Safety Systems": "🚨",
};

type Stats = { total: number; mastered: number; pct: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeWeakestDomain(license: LicenseClass, endorsements: Endorsement[], masteredIds: number[]) {
  // Weakest = lowest mastery % among relevant categories with >= 5 questions
  const relevantQs = questions.filter((q) => {
    if (!q.licenseClasses.includes(license)) return false;
    if (q.endorsements && q.endorsements.length > 0) {
      return q.endorsements.some((e) => endorsements.includes(e));
    }
    return true;
  });

  const cats = Array.from(new Set(relevantQs.map((q) => q.category)));
  let weakest = { cat: "Air Brakes", pct: 101, total: 0 };

  for (const cat of cats) {
    const catQs = relevantQs.filter((q) => q.category === cat);
    const total = catQs.length;
    if (total < 5) continue;
    const mastered = catQs.filter((q) => masteredIds.includes(q.id)).length;
    const pct = total ? Math.round((mastered / total) * 100) : 0;
    if (pct < weakest.pct) weakest = { cat, pct, total };
  }

  const severity = clamp(100 - (weakest.pct === 101 ? 60 : weakest.pct), 15, 95);
  return { weakestDomain: weakest.cat, weakestSeverity: severity };
}

export default function StudyPage() {
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");
  const [masteredIds, setMasteredIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [focusOnly, setFocusOnly] = useState(false);

  useEffect(() => {
    setLicense((localStorage.getItem("userLevel") as LicenseClass) || "A");

    const endRaw = localStorage.getItem("userEndorsements");
    setEndorsements(endRaw ? JSON.parse(endRaw) : []);

    setUserState(localStorage.getItem("userState") || "TX");

    const m = localStorage.getItem("mastered-ids");
    setMasteredIds(m ? JSON.parse(m) : []);
  }, []);

  // keep TruckSchematic in sync (weakest domain + severity)
  useEffect(() => {
    const { weakestDomain, weakestSeverity } = computeWeakestDomain(license, endorsements, masteredIds);
    localStorage.setItem("weakestDomain", weakestDomain);
    localStorage.setItem("weakestSeverity", String(weakestSeverity));
  }, [license, endorsements, masteredIds]);

  const relevantQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        return q.endorsements.some((e) => endorsements.includes(e));
      }
      return true;
    });
  }, [license, endorsements]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(relevantQuestions.map((q) => q.category))).sort();
    return cats;
  }, [relevantQuestions]);

  const statsByCat = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const cat of categories) {
      const catQs = relevantQuestions.filter((q) => q.category === cat);
      const total = catQs.length;
      const mastered = catQs.filter((q) => masteredIds.includes(q.id)).length;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      map.set(cat, { total, mastered, pct });
    }
    return map;
  }, [categories, relevantQuestions, masteredIds]);

  const { weakestDomain, weakestSeverity } = useMemo(
    () => computeWeakestDomain(license, endorsements, masteredIds),
    [license, endorsements, masteredIds]
  );

  const filteredCats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((cat) => {
      const st = statsByCat.get(cat);
      if (!st) return false;

      const matchesQuery =
        !q ||
        cat.toLowerCase().includes(q) ||
        (ICONS[cat] || "").toLowerCase().includes(q) ||
        (st.pct + "%").includes(q);

      const focusGate = !focusOnly || st.pct < 80;
      return matchesQuery && focusGate;
    });
  }, [categories, query, focusOnly, statsByCat]);

  const overall = useMemo(() => {
    const total = relevantQuestions.length;
    const mastered = relevantQuestions.filter((q) => masteredIds.includes(q.id)).length;
    const pct = total ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, pct };
  }, [relevantQuestions, masteredIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* Header */}
      <header className="px-6 pt-10 pb-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Training Console
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">
              Technical Manuals
            </h1>
            <p className="text-sm text-slate-400 font-mono">
              RIG CONFIGURATION: <span className="text-amber-500">CLASS {license}</span>{" "}
              <span className="text-slate-600">•</span>{" "}
              <span className="text-slate-400">{userState} DMV</span>
            </p>
          </div>

          {/* Overall progress badge */}
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Overall Mastery
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <div className="w-28">
                <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overall.pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                  />
                </div>
              </div>
              <div className="text-sm font-mono font-black text-amber-400">{overall.pct}%</div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {overall.mastered}/{overall.total} mastered
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search manuals (e.g., Air Brakes, Hazmat, Pre-Trip)…"
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <button
            onClick={() => setFocusOnly((p) => !p)}
            className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
              focusOnly
                ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {focusOnly ? "Focus Mode: ON" : "Focus Mode"}
          </button>
        </div>
      </header>

      <main className="px-4 max-w-3xl mx-auto space-y-4">
        {/* High-value “Focus Target” panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.16),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Recommended Focus
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{ICONS[weakestDomain] || "📍"}</div>
                <div>
                  <div className="font-black text-white text-lg leading-tight">{weakestDomain}</div>
                  <div className="text-sm text-slate-400">
                    Highest impact module right now.
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Severity
              </div>
              <div className="mt-1 flex items-center gap-2 sm:justify-end">
                <div className="w-28">
                  <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${weakestSeverity}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                    />
                  </div>
                </div>
                <div className="text-sm font-mono font-black text-amber-400">{weakestSeverity}%</div>
              </div>

              <Link
                href={`/station?mode=study&category=${encodeURIComponent(weakestDomain)}`}
                className="inline-block mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors"
              >
                Start Focus Module →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* “Jurisdiction Data” panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
              JURISDICTION DATA
            </div>
            <div className="font-bold text-white text-sm">
              {userState} Commercial Fines & Limits
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">
              Quick-reference sheet for test wording.
            </div>
          </div>
          <button className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30">
            VIEW PDF
          </button>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {filteredCats.map((cat) => {
              const st = statsByCat.get(cat)!;

              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    href={`/station?mode=study&category=${encodeURIComponent(cat)}`}
                    className="group relative block overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-amber-500/50 transition-all"
                  >
                    {/* Progress wash */}
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-800/50"
                      style={{ width: `${st.pct}%` }}
                    />
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                          {ICONS[cat] || "📂"}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-slate-200 group-hover:text-white truncate">
                            {cat}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="text-[10px] font-mono text-slate-500">
                              MASTERY: <span className="text-slate-300">{st.pct}%</span>{" "}
                              <span className="text-slate-600">({st.mastered}/{st.total})</span>
                            </div>
                            {st.pct >= 80 && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Ready
                              </span>
                            )}
                            {st.pct < 80 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-400">
                                Improve
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3">
                        {/* micro progress ring */}
                        <div className="relative w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                          <div className="text-[10px] font-mono text-slate-400">{st.pct}</div>
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                              boxShadow: st.pct < 80 ? "0 0 0 0 rgba(245,158,11,0)" : "0 0 0 0 rgba(16,185,129,0)",
                            }}
                            animate={
                              st.pct < 80
                                ? { boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 18px 2px rgba(245,158,11,0.22)", "0 0 0 0 rgba(245,158,11,0)"] }
                                : { boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 18px 2px rgba(16,185,129,0.18)", "0 0 0 0 rgba(16,185,129,0)"] }
                            }
                            transition={{ duration: 2.2, repeat: Infinity }}
                          />
                        </div>

                        <div className="w-10 h-10 rounded-2xl border border-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-slate-950 transition-colors text-slate-500">
                          →
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredCats.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="text-slate-300 font-black">No manuals match that filter.</div>
              <div className="text-sm text-slate-500 mt-1">Try a different keyword or turn off Focus Mode.</div>
            </div>
          )}
        </div>
      </main>

      <Dock />
    </div>
  );
}
