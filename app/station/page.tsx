// app/station/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { questions, type Question } from "@/lib/questions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// --- CONFIG ---
const DRILL_DURATION_SEC = 420; // 7:00 (per module session)
const DRILL_Q_TIME_SEC = 45;    // soft pacing per question (not hard fail)

// --- HELPERS ---
function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

function pillTone(kind: "slate" | "amber" | "emerald" | "red") {
  if (kind === "amber") return "bg-amber-500/10 border-amber-500/30 text-amber-400";
  if (kind === "emerald") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  if (kind === "red") return "bg-red-500/10 border-red-500/30 text-red-400";
  return "bg-white/5 border-white/10 text-slate-300";
}

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "emerald" | "red";
}) {
  return (
    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest ${pillTone(tone)}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = clamp(value, 0, 100);
  return (
    <div className="h-2 rounded-full bg-slate-800/70 border border-slate-700 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
      />
    </div>
  );
}

function Sheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close sheet"
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed z-[75] left-0 right-0 bottom-0"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
          >
            <div className="mx-auto max-w-2xl bg-slate-950 border border-slate-800 rounded-t-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Study Station</div>
                  <div className="text-white font-black">{title}</div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center text-slate-300"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get("category") || "";
  const mode = (searchParams.get("mode") || "drill") as "drill" | "study"; // drill = timed, study = untimed

  const [pool, setPool] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);

  const [selected, setSelected] = useState<number | null>(null);
  const [showRationale, setShowRationale] = useState(false);

  // Timers (drill)
  const [drillEndAt, setDrillEndAt] = useState<number>(0);
  const [drillTimeLeft, setDrillTimeLeft] = useState<number>(DRILL_DURATION_SEC);
  const [qStartedAt, setQStartedAt] = useState<number>(Date.now());

  // Session stats
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);

  // UX
  const [reviewOpen, setReviewOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  // Build pool
  useEffect(() => {
    if (!category) return;

    const filtered = questions.filter((q) => q.category === category);
    // drill feels “real”: randomize; study can keep order but random looks fine too
    const final = mode === "drill" ? shuffle(filtered) : filtered;
    setPool(final);
    setIdx(0);
    setSelected(null);
    setShowRationale(false);
    setCorrect(0);
    setAttempted(0);
    setStreak(0);
    setReviewOpen(false);
    setCompleteOpen(false);

    // timed drill starts at entry
    if (mode === "drill") {
      const end = Date.now() + DRILL_DURATION_SEC * 1000;
      setDrillEndAt(end);
      setDrillTimeLeft(DRILL_DURATION_SEC);
    } else {
      setDrillEndAt(0);
      setDrillTimeLeft(DRILL_DURATION_SEC);
    }

    setQStartedAt(Date.now());
  }, [category, mode]);

  // Drill timer tick
  useEffect(() => {
    if (mode !== "drill" || !drillEndAt) return;

    const t = setInterval(() => {
      const remaining = Math.floor((drillEndAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setDrillTimeLeft(0);
        setCompleteOpen(true);
        clearInterval(t);
      } else {
        setDrillTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(t);
  }, [mode, drillEndAt]);

  const currentQ = pool[idx];

  const answeredIds = useMemo(() => {
    const map = readJson<Record<number, number>>(`station-${category}-answers`, {});
    return map;
  }, [category]);

  // Question-level soft pacing
  const qTimeLeft = useMemo(() => {
    if (mode !== "drill") return DRILL_Q_TIME_SEC;
    const elapsed = Math.floor((Date.now() - qStartedAt) / 1000);
    return clamp(DRILL_Q_TIME_SEC - elapsed, 0, DRILL_Q_TIME_SEC);
  }, [mode, qStartedAt]);

  // Derived stats
  const scorePct = useMemo(() => (attempted ? Math.round((correct / attempted) * 100) : 0), [correct, attempted]);
  const progressPct = useMemo(() => (pool.length ? Math.round(((idx + 1) / pool.length) * 100) : 0), [idx, pool.length]);

  const timeTone = useMemo(() => {
    if (mode !== "drill") return "slate";
    if (drillTimeLeft <= 30) return "red";
    if (drillTimeLeft <= 90) return "amber";
    return "slate";
  }, [mode, drillTimeLeft]);

  // Save mastery + station progress
  const recordAttempt = useCallback(
    (questionId: number, chosen: number, isCorrect: boolean) => {
      // per-station answers (for navigator)
      const key = `station-${category}-answers`;
      const map = readJson<Record<number, number>>(key, {});
      map[questionId] = chosen;
      writeJson(key, map);

      // mastery list (your existing logic)
      if (isCorrect) {
        const mastered = readJson<number[]>("mastered-ids", []);
        if (!mastered.includes(questionId)) writeJson("mastered-ids", [...mastered, questionId]);
      }
    },
    [category]
  );

  const handleSelect = useCallback(
    (i: number) => {
      if (!currentQ) return;
      if (showRationale) return;
      if (mode === "drill" && drillTimeLeft <= 0) return;

      setSelected(i);
      setShowRationale(true);

      const isCorrect = i === currentQ.correctIndex;

      setAttempted((p) => p + 1);
      setCorrect((p) => p + (isCorrect ? 1 : 0));
      setStreak((p) => (isCorrect ? p + 1 : 0));

      recordAttempt(currentQ.id, i, isCorrect);
    },
    [currentQ, showRationale, mode, drillTimeLeft, recordAttempt]
  );

  const next = useCallback(() => {
    if (idx < pool.length - 1) {
      setIdx((p) => p + 1);
      setSelected(null);
      setShowRationale(false);
      setQStartedAt(Date.now());
    } else {
      setCompleteOpen(true);
    }
  }, [idx, pool.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape") {
        setReviewOpen(false);
        setCompleteOpen(false);
        return;
      }

      if (key === "r") setReviewOpen((p) => !p);

      if (showRationale) {
        if (key === "enter" || key === " ") next();
        return;
      }

      const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
      if (map[key] !== undefined) handleSelect(map[key]);

      if (key === "arrowright") {
        if (showRationale) next();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSelect, next, showRationale]);

  // Navigator grid
  const Navigator = useCallback(
    ({ onPick }: { onPick: (i: number) => void }) => {
      const cells = Array.from({ length: pool.length }, (_, i) => i);
      const answered = readJson<Record<number, number>>(`station-${category}-answers`, {});

      const getCellClass = (i: number) => {
        const q = pool[i];
        const isCurrent = i === idx;
        const isAnswered = q ? answered[q.id] !== undefined : false;

        if (isCurrent) return "bg-amber-500 text-slate-950 border-amber-500";
        if (isAnswered) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
        return "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-600";
      };

      return (
        <div className="grid grid-cols-7 gap-2">
          {cells.map((i) => (
            <button
              key={i}
              onClick={() => onPick(i)}
              className={`h-10 rounded-xl border text-[11px] font-black font-mono transition-colors ${getCellClass(i)}`}
              title={`Question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      );
    },
    [pool, idx, category]
  );

  // Completion (summary) sheet
  const CompleteSheet = useMemo(() => {
    const passed = scorePct >= 80 && attempted >= Math.min(10, pool.length); // light gate so it feels fair
    return (
      <Sheet
        open={completeOpen}
        title="Module Complete"
        onClose={() => setCompleteOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pill tone={passed ? "emerald" : "amber"}>{passed ? "Qualified" : "Keep Training"}</Pill>
            <Pill tone="slate">{mode === "drill" ? "Timed Drill" : "Study Mode"}</Pill>
            {mode === "drill" && <Pill tone={timeTone as any}>Time {formatTime(drillTimeLeft)}</Pill>}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Accuracy</div>
                <div className="text-2xl font-mono font-black text-white">{scorePct}%</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Correct</div>
                <div className="text-2xl font-mono font-black text-white">{correct}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attempted</div>
                <div className="text-2xl font-mono font-black text-white">{attempted}</div>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={scorePct} />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                // restart same station
                const filtered = questions.filter((q) => q.category === category);
                const final = mode === "drill" ? shuffle(filtered) : filtered;
                setPool(final);
                setIdx(0);
                setSelected(null);
                setShowRationale(false);
                setCorrect(0);
                setAttempted(0);
                setStreak(0);
                setQStartedAt(Date.now());
                setCompleteOpen(false);

                if (mode === "drill") {
                  const end = Date.now() + DRILL_DURATION_SEC * 1000;
                  setDrillEndAt(end);
                  setDrillTimeLeft(DRILL_DURATION_SEC);
                }
              }}
              className="flex-1 py-3 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 font-black uppercase tracking-widest text-[11px]"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/study")}
              className="flex-1 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest text-[11px]"
            >
              Back to Study
            </button>
          </div>
        </div>
      </Sheet>
    );
  }, [completeOpen, scorePct, attempted, pool.length, mode, timeTone, drillTimeLeft, correct, category, router]);

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono">
        INITIALIZING…
      </div>
    );
  }

  // Styling for options
  const optionStyle = (i: number) => {
    // base
    let style = "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-600 hover:bg-slate-900/60";

    if (!showRationale) {
      if (i === selected) style = "border-amber-500 bg-amber-500/10 text-white";
      return style;
    }

    // reveal
    if (i === currentQ.correctIndex) return "border-emerald-500 bg-emerald-500/10 text-emerald-200";
    if (i === selected) return "border-red-500 bg-red-500/10 text-red-200";
    return "border-slate-800 bg-slate-950/30 text-slate-500 opacity-70";
  };

  const rationaleTone = selected === currentQ.correctIndex ? "emerald" : "red";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />

      {/* Sheets */}
      <Sheet open={reviewOpen} title="Navigator" onClose={() => setReviewOpen(false)}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Pill tone="slate">{category}</Pill>
              <Pill tone="emerald">Accuracy {scorePct}%</Pill>
              <Pill tone="amber">Streak {streak}</Pill>
            </div>
            {mode === "drill" && <Pill tone={timeTone as any}>Time {formatTime(drillTimeLeft)}</Pill>}
          </div>

          <Navigator
            onPick={(i) => {
              setIdx(i);
              setSelected(null);
              setShowRationale(false);
              setQStartedAt(Date.now());
              setReviewOpen(false);
            }}
          />
        </div>
      </Sheet>

      {CompleteSheet}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/study" className="text-[11px] font-black text-slate-400 hover:text-white uppercase tracking-widest">
            ← Exit
          </Link>

          <div className="text-center min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 truncate">
              {category} • {mode === "drill" ? "Timed Drill" : "Study"}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Pill tone="slate">
                {idx + 1}/{pool.length}
              </Pill>
              <Pill tone="emerald">Acc {scorePct}%</Pill>
              <Pill tone="amber">Streak {streak}</Pill>
            </div>
          </div>

          <div className="text-right">
            {mode === "drill" ? (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session</div>
                <div
                  className={`text-lg font-mono font-black ${
                    timeTone === "red" ? "text-red-400 animate-pulse" : timeTone === "amber" ? "text-amber-400" : "text-white"
                  }`}
                >
                  {formatTime(drillTimeLeft)}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Navigator</div>
                <button
                  onClick={() => setReviewOpen(true)}
                  className="text-[11px] font-black uppercase tracking-widest text-slate-300 hover:text-white"
                >
                  Open
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            <span>
              Progress <span className="text-slate-200 font-bold">{progressPct}%</span>
            </span>
            {mode === "drill" && (
              <span>
                Pace <span className={`font-bold ${qTimeLeft <= 10 ? "text-amber-400" : "text-slate-200"}`}>{formatTime(qTimeLeft)}</span>
              </span>
            )}
          </div>
          <ProgressBar value={progressPct} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-28">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Pill tone="slate">Question {idx + 1}</Pill>
              {mode === "drill" && <Pill tone={timeTone as any}>Session {formatTime(drillTimeLeft)}</Pill>}
              {showRationale && <Pill tone={rationaleTone as any}>{selected === currentQ.correctIndex ? "Correct" : "Incorrect"}</Pill>}
            </div>

            <button
              onClick={() => setReviewOpen(true)}
              className="px-4 py-2 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-200 font-black uppercase tracking-widest text-[10px]"
              title="Review (R)"
            >
              Review
            </button>
          </div>

          <div className="p-6 md:p-8">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Prompt</div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-100 leading-relaxed mb-8">
              {currentQ.text}
            </h2>

            <div className="space-y-3">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all ${optionStyle(i)}`}
                  disabled={mode === "drill" && drillTimeLeft <= 0}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 w-8 h-8 rounded-xl border border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-300">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1">
                      <div className="text-base md:text-lg">{opt}</div>
                      {!showRationale && (
                        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                          Press <span className="text-slate-300 font-bold">{String.fromCharCode(65 + i)}</span>
                        </div>
                      )}
                    </div>

                    {showRationale && i === currentQ.correctIndex && (
                      <span className="text-emerald-400 font-black">✓</span>
                    )}
                    {showRationale && i === selected && i !== currentQ.correctIndex && (
                      <span className="text-red-400 font-black">✕</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Hint row */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                Shortcuts: <span className="text-slate-300 font-bold">A/B/C/D</span> select •{" "}
                <span className="text-slate-300 font-bold">R</span> review •{" "}
                {showRationale ? <span>Press <span className="text-slate-300 font-bold">Enter</span> for next</span> : null}
              </div>

              {showRationale && (
                <button
                  onClick={next}
                  className="px-5 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest text-[11px]"
                >
                  {idx < pool.length - 1 ? "Next" : "Complete"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Rationale Drawer */}
      <AnimatePresence>
        {showRationale && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="bg-slate-950/90 backdrop-blur-xl border-t border-slate-800">
              <div className="max-w-3xl mx-auto px-4 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Pill tone={rationaleTone as any}>{selected === currentQ.correctIndex ? "Correct" : "Incorrect"}</Pill>
                      <Pill tone="slate">Rationale</Pill>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  </div>

                  <button
                    onClick={next}
                    className="shrink-0 px-5 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest text-[11px]"
                  >
                    {idx < pool.length - 1 ? "Next Question" : "Complete Module"}
                  </button>
                </div>

                {mode === "drill" && (
                  <div className="mt-3 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                    Pace target: {formatTime(DRILL_Q_TIME_SEC)} per question • Session ends in{" "}
                    <span className={`font-bold ${timeTone === "red" ? "text-red-400" : timeTone === "amber" ? "text-amber-400" : "text-slate-300"}`}>
                      {formatTime(drillTimeLeft)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StationPage() {
  return (
    <Suspense>
      <StationContent />
    </Suspense>
  );
}
