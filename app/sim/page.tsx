// app/sim/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  questions,
  type Question,
  type LicenseClass,
  type Endorsement,
} from "@/lib/questions";
import { useRouter } from "next/navigation";

// -------------------- TYPES --------------------
type Stage = "quiz" | "analyzing" | "preview";

type AnswerRecord = {
  id: number;
  category: string;
  isCorrect: boolean;
  text: string;
  options: string[];
  explanation: string;
  selectedIndex: number; // -1 if unanswered (timer hit 0)
  correctIndex: number;
};

type CategoryBreakdown = Record<
  string,
  { total: number; correct: number; accuracy: number }
>;

type ConsolidatedConfig = {
  license?: LicenseClass;
  endorsements?: Endorsement[];
  userState?: string;
};

// -------------------- CONSTANTS --------------------
const TOTAL_QUESTIONS = 5;
const QUIZ_SECONDS = 300;

// Optional consolidated config key (supports future changes + keeps legacy working)
const CONFIG_KEY = "haulOS.config.v1";

// Legacy keys (landing page already uses these)
const LEGACY_KEYS = {
  license: "userLevel",
  endorsements: "userEndorsements",
  userState: "userState",
};

// Result keys (keep backwards compatibility with your existing pay/dashboard)
const RESULT_KEYS = {
  diagnosticScore: "diagnosticScore",
  weakestDomain: "weakestDomain",

  // For compatibility with the other AI version
  diagnosticAnswers: "diagnosticAnswers",
  diagnosticTimedOut: "diagnosticTimedOut",

  // Extra (richer analytics for later dashboard)
  haulAnswers: "haul_diagnostic_answers",
  haulBreakdown: "haul_diagnostic_breakdown",
  haulMeta: "haul_diagnostic_meta",
  sessionId: "haul_session_id",
  startedAt: "haul_diagnostic_started_at",
};

// -------------------- SAFE STORAGE --------------------
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

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function makeSessionId() {
  const a = Math.random().toString(16).slice(2, 10);
  const b = Date.now().toString(16).slice(-6);
  return `S-${a}-${b}`.toUpperCase();
}

// -------------------- HELPERS --------------------
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function classLabel(license: LicenseClass) {
  if (license === "A") return "Class A";
  if (license === "B") return "Class B";
  if (license === "C") return "Class C";
  return "Class D";
}

function computeBreakdown(finalAnswers: AnswerRecord[]): CategoryBreakdown {
  const map: Record<string, { total: number; correct: number }> = {};
  for (const a of finalAnswers) {
    if (!map[a.category]) map[a.category] = { total: 0, correct: 0 };
    map[a.category].total += 1;
    if (a.isCorrect) map[a.category].correct += 1;
  }
  const out: CategoryBreakdown = {};
  for (const k of Object.keys(map)) {
    const total = map[k].total;
    const correct = map[k].correct;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    out[k] = { total, correct, accuracy };
  }
  return out;
}

function pickWeakestDomain(breakdown: CategoryBreakdown) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return "General Knowledge";
  entries.sort((a, b) => {
    const diff = a[1].accuracy - b[1].accuracy;
    if (diff !== 0) return diff;
    return b[1].total - a[1].total;
  });
  return entries[0]?.[0] || "General Knowledge";
}

function riskFromScore(score: number) {
  if (score >= 80) return { label: "CLEAR", tone: "emerald" as const };
  if (score >= 60) return { label: "ELEVATED", tone: "amber" as const };
  return { label: "HIGH", tone: "red" as const };
}

function toneClasses(tone: "emerald" | "amber" | "red") {
  if (tone === "emerald")
    return {
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      bar: "bg-emerald-500",
      glow: "shadow-[0_0_40px_-14px_rgba(16,185,129,0.6)]",
    };
  if (tone === "amber")
    return {
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      bar: "bg-amber-500",
      glow: "shadow-[0_0_40px_-14px_rgba(245,158,11,0.6)]",
    };
  return {
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    text: "text-red-300",
    bar: "bg-red-500",
    glow: "shadow-[0_0_40px_-14px_rgba(239,68,68,0.55)]",
  };
}

// Pick 5 but try to avoid 5 questions all from one category
function pickDiagnosticQuestions(eligible: Question[]) {
  const source = eligible.length ? eligible : questions;
  const shuffled = shuffle(source);

  const picked: Question[] = [];
  const seenCats = new Set<string>();

  for (const q of shuffled) {
    if (picked.length >= TOTAL_QUESTIONS) break;

    // Prefer variety early; relax later so we always fill
    if (!seenCats.has(q.category) || picked.length >= 3) {
      picked.push(q);
      seenCats.add(q.category);
    }
  }

  // Fill if needed (unique by id)
  if (picked.length < TOTAL_QUESTIONS) {
    const pool = shuffle(questions).filter((q) => !picked.some((p) => p.id === q.id));
    while (picked.length < TOTAL_QUESTIONS && pool.length) picked.push(pool.shift()!);
  }

  return picked.slice(0, TOTAL_QUESTIONS);
}

// -------------------- COMPONENT --------------------
export default function DiagnosticPage() {
  const router = useRouter();

  // Personalization from landing
  const [userLicense, setUserLicense] = useState<LicenseClass>("A");
  const [userEndorsements, setUserEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");

  // Flow
  const [stage, setStage] = useState<Stage>("quiz");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);
  const quizStartMsRef = useRef<number>(Date.now());

  // Analyzing animation
  const [analysisText, setAnalysisText] = useState("INITIALIZING SYSTEM...");
  const [analysisPct, setAnalysisPct] = useState(0);
  const analyzingTimers = useRef<number[]>([]);

  // Preview state (avoid reading localStorage inside render)
  const [finalScore, setFinalScore] = useState(0);
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [finalBreakdown, setFinalBreakdown] = useState<CategoryBreakdown>({});
  const [missed, setMissed] = useState<AnswerRecord | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const question = activeQuestions[currentQIndex];

  const chips = useMemo(() => {
    const e = userEndorsements.length ? userEndorsements.join(", ") : "No modules";
    return `${userState} • ${classLabel(userLicense)} • ${e}`;
  }, [userEndorsements, userLicense, userState]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const urgency =
    timeLeft <= 60 ? "high" : timeLeft <= 120 ? "med" : "low";

  // -------------------- INIT: Load config & pick questions --------------------
  useEffect(() => {
    // Session + start time for later analytics
    const sid = safeGet(RESULT_KEYS.sessionId);
    if (!sid) safeSet(RESULT_KEYS.sessionId, makeSessionId());
    const startedAt = safeGet(RESULT_KEYS.startedAt);
    if (!startedAt) safeSet(RESULT_KEYS.startedAt, new Date().toISOString());

    const cfg = safeParseJSON<ConsolidatedConfig>(safeGet(CONFIG_KEY));
    const legacyLicense =
      (safeGet(LEGACY_KEYS.license) as LicenseClass | null) || "A";
    const legacyEndorsements =
      safeParseJSON<Endorsement[]>(safeGet(LEGACY_KEYS.endorsements)) || [];
    const legacyState = safeGet(LEGACY_KEYS.userState) || "TX";

    const license = cfg?.license || legacyLicense || "A";
    const endorsements = Array.isArray(cfg?.endorsements)
      ? cfg!.endorsements!
      : legacyEndorsements;
    const st = cfg?.userState || legacyState || "TX";

    setUserLicense(license);
    setUserEndorsements(Array.from(new Set(endorsements)));
    setUserState(st);

    // Filter questions by license + endorsement rules
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;

      // If question requires endorsements, user must have at least one required item
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => endorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    setActiveQuestions(pickDiagnosticQuestions(eligible));
    quizStartMsRef.current = Date.now();
  }, []);

  // -------------------- TIMER TICK --------------------
  useEffect(() => {
    if (stage !== "quiz") return;
    const t = window.setInterval(() => {
      setTimeLeft((p) => Math.max(0, p - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  // Auto-stop at 0 (mark remaining unanswered wrong)
  useEffect(() => {
    if (stage !== "quiz") return;
    if (timeLeft > 0) return;
    if (!activeQuestions.length) return;

    const final: AnswerRecord[] = [...answers];

    // Add remaining questions as unanswered wrong
    for (let i = currentQIndex; i < TOTAL_QUESTIONS; i++) {
      const q = activeQuestions[i];
      if (!q) continue;

      // If user is currently on a question and selectedOption exists, we still treat as unanswered
      // because they didn't confirm. That pressure is intentional.
      final.push({
        id: q.id,
        category: q.category,
        isCorrect: false,
        text: q.text,
        options: q.options,
        explanation: q.explanation,
        selectedIndex: -1,
        correctIndex: q.correctIndex,
      });
    }

    runStopProtocol(final, { timedOut: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // -------------------- KEYBOARD SHORTCUTS --------------------
  useEffect(() => {
    if (stage !== "quiz") return;

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === "1" || k === "a") setSelectedOption(0);
      if (k === "2" || k === "b") setSelectedOption(1);
      if (k === "3" || k === "c") setSelectedOption(2);
      if (k === "4" || k === "d") setSelectedOption(3);

      if (k === "enter") {
        if (selectedOption !== null) commitAnswer();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedOption, question, currentQIndex, answers]);

  // -------------------- ACTIONS --------------------
  const clearAnalyzingTimers = () => {
    analyzingTimers.current.forEach((id) => window.clearTimeout(id));
    analyzingTimers.current = [];
  };

  const restart = () => {
    clearAnalyzingTimers();

    setStage("quiz");
    setAnswers([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setTimeLeft(QUIZ_SECONDS);
    quizStartMsRef.current = Date.now();

    // Re-pick questions (keep personalization)
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(userLicense)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => userEndorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    setActiveQuestions(pickDiagnosticQuestions(eligible));
  };

  const commitAnswer = () => {
    if (!question || selectedOption === null) return;

    const record: AnswerRecord = {
      id: question.id,
      category: question.category,
      isCorrect: selectedOption === question.correctIndex,
      text: question.text,
      options: question.options,
      explanation: question.explanation,
      selectedIndex: selectedOption,
      correctIndex: question.correctIndex,
    };

    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    if (currentQIndex >= TOTAL_QUESTIONS - 1) {
      runStopProtocol(newAnswers, { timedOut: false });
    } else {
      setCurrentQIndex((p) => p + 1);
      setSelectedOption(null);
    }
  };

  const runStopProtocol = (finalAnswers: AnswerRecord[], opts: { timedOut: boolean }) => {
    if (stage !== "quiz") return; // prevent double-run
    setStage("analyzing");
    clearAnalyzingTimers();

    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const score = Math.round((correct / TOTAL_QUESTIONS) * 100);

    const breakdown = computeBreakdown(finalAnswers);
    const weak = pickWeakestDomain(breakdown);

    // Tease: prefer a miss in the weakest domain
    const teased =
      finalAnswers.find((a) => !a.isCorrect && a.category === weak) ||
      finalAnswers.find((a) => !a.isCorrect) ||
      null;

    // Persist (compat + richer)
    safeSet(RESULT_KEYS.diagnosticScore, String(score));
    safeSet(RESULT_KEYS.weakestDomain, weak);
    safeSet(RESULT_KEYS.diagnosticAnswers, JSON.stringify(finalAnswers));
    safeSet(RESULT_KEYS.diagnosticTimedOut, opts.timedOut ? "1" : "0");

    safeSet(RESULT_KEYS.haulAnswers, JSON.stringify(finalAnswers));
    safeSet(RESULT_KEYS.haulBreakdown, JSON.stringify(breakdown));

    const meta = {
      sessionId: safeGet(RESULT_KEYS.sessionId) || makeSessionId(),
      startedAt: safeGet(RESULT_KEYS.startedAt) || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      license: userLicense,
      userState,
      endorsements: userEndorsements,
      timeLimitSec: QUIZ_SECONDS,
      timeUsedSec: Math.max(0, Math.round((Date.now() - quizStartMsRef.current) / 1000)),
    };
    safeSet(RESULT_KEYS.haulMeta, JSON.stringify(meta));

    // Set preview state now (no localStorage reads in render)
    setFinalScore(score);
    setWeakDomain(weak);
    setFinalBreakdown(breakdown);
    setMissed(teased);
    setTimedOut(opts.timedOut);

    // Personalized analyzing animation
    const seq = [
      { t: 550, pct: 12, text: `LOADING ${userState} EXAM PROFILE...` },
      { t: 1300, pct: 28, text: `SYNCING ${classLabel(userLicense).toUpperCase()} MODULES...` },
      { t: 2150, pct: 46, text: `SCANNING WEAKNESS: ${weak.toUpperCase()}...` },
      { t: 2950, pct: 65, text: `CALCULATING PASS PROBABILITY...` },
      {
        t: 3800,
        pct: 84,
        text: opts.timedOut ? `TIME EXPIRED — SAFETY STOP...` : `CRITICAL FAILURE DETECTED...`,
      },
      { t: 4650, pct: 100, text: `EXAM STOPPED.` },
    ];

    setAnalysisPct(0);
    setAnalysisText("INITIALIZING SYSTEM...");

    seq.forEach((step) => {
      const id = window.setTimeout(() => {
        setAnalysisPct(step.pct);
        setAnalysisText(step.text);
      }, step.t);
      analyzingTimers.current.push(id);
    });

    const doneId = window.setTimeout(() => setStage("preview"), 5200);
    analyzingTimers.current.push(doneId);
  };

  // ---------------------------
  // VIEW 1: ANALYZING
  // ---------------------------
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.9)_75%)]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-widest">
              System Scan • {userState} • {classLabel(userLicense)}
            </div>
            <div className="mt-4 text-6xl animate-pulse">⚠️</div>
            <h2 className="mt-4 text-3xl font-black tracking-tighter">STOP PROTOCOL</h2>
            <p className="mt-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
              {chips}
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.2),transparent_60%)]" />
            <div className="relative">
              <div className="flex justify-between text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-mono">
                <span>System Status</span>
                <span>{analysisPct}%</span>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>

              <p className="text-amber-300 font-black text-sm">
                {">"} {analysisText}
              </p>

              <div className="mt-5 text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center justify-between">
                <span>Encrypted</span>
                <span>v6.0 • Haul.OS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // VIEW 2: PREVIEW / PAYWALL
  // ---------------------------
  if (stage === "preview") {
    const risk = riskFromScore(finalScore);
    const tc = toneClasses(risk.tone);
    const missing = Math.max(0, 80 - finalScore);

    const breakdownEntries = Object.entries(finalBreakdown).sort(
      (a, b) => a[1].accuracy - b[1].accuracy
    );

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center font-sans pb-28">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.9)_75%)]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Status Header */}
          <div className={`rounded-3xl p-5 border ${tc.border} ${tc.bg} text-center`}>
            <div className={`font-black text-xs uppercase tracking-[0.2em] mb-1 ${tc.text}`}>
              Status: {risk.label === "CLEAR" ? "Cleared" : "Grounded"}
            </div>
            <div className="text-3xl font-black">RISK LEVEL: {risk.label}</div>
            <div className="text-slate-300 text-sm mt-1">
              Readiness Score: <span className={`font-black ${tc.text}`}>{finalScore}%</span>
              {risk.label !== "CLEAR" && (
                <span className="text-slate-400"> • Need +{missing}% to hit 80%</span>
              )}
            </div>

            <div className="mt-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              {chips}
            </div>

            {timedOut && (
              <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-300">
                Time expired — this is exactly how the real test feels.
              </div>
            )}
          </div>

          {/* Breakdown (makes it feel truly personalized) */}
          {breakdownEntries.length > 0 && (
            <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_60%)]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black text-slate-300 uppercase tracking-widest">
                    Diagnostic Breakdown
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Target: {weakDomain}
                  </div>
                </div>

                <div className="space-y-2">
                  {breakdownEntries.slice(0, 4).map(([cat, v]) => (
                    <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-black text-white">{cat}</div>
                        <div className="text-xs font-mono text-slate-300">
                          {v.correct}/{v.total} • {v.accuracy}%
                        </div>
                      </div>
                      <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            v.accuracy >= 80 ? "bg-emerald-500" : v.accuracy >= 60 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, v.accuracy))}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  We will build your Fix Plan around <span className="text-slate-300 font-black">{weakDomain}</span> first (fastest score lift).
                </div>
              </div>
            </div>
          )}

          {/* Hook: Missed Question */}
          {missed ? (
            <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.25),transparent_60%)]" />
              <div className="relative">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Priority Fix: {missed.category}
                </div>

                <p className="text-white font-bold text-sm leading-relaxed">{missed.text}</p>

                <div className="mt-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 relative">
                  <div className="filter blur-sm select-none opacity-60 text-sm text-slate-200 leading-relaxed">
                    {missed.explanation}{" "}
                    {missed.selectedIndex === -1 ? (
                      <span>(You did not answer — timer hit 0.)</span>
                    ) : (
                      <span>
                        (You picked {String.fromCharCode(65 + missed.selectedIndex)} — correct is{" "}
                        {String.fromCharCode(65 + missed.correctIndex)}.)
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2">
                      <span>🔒</span>
                      <span className="text-xs font-black uppercase tracking-wider">Fix Plan Locked</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Unlock to see the rule + drill it until it sticks (fastest lift).
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-center">
              <div className="text-emerald-300 text-4xl mb-2">✅</div>
              <div className="text-lg font-black">No failures detected in this scan.</div>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Now make it <span className="text-white font-bold">repeatable</span>. Unlock full simulator + timed reps to keep 80%+ on demand.
              </p>
            </div>
          )}

          {/* Sticky CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
            <div className="max-w-md mx-auto">
              <button
                onClick={() => router.push("/pay")}
                className={`w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-widest transition-transform active:scale-95 ${tc.glow}`}
              >
                Unlock Fix Plan & Pass →
              </button>
              <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                🔒 No credit card stored here • Stripe secure checkout
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button onClick={restart} className="text-xs text-slate-500 underline hover:text-slate-300">
              Restart Diagnostic
            </button>
            <button onClick={() => router.push("/")} className="text-xs text-slate-500 underline hover:text-slate-300">
              Change setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // VIEW 3: QUIZ
  // ---------------------------
  if (!question) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.9)_75%)]" />
      </div>

      {/* HUD Header */}
      <div className="relative z-20 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Diagnostic Active • Tuned to {userState}
            </div>
            <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mt-1">
              {classLabel(userLicense)} • {userEndorsements.length ? userEndorsements.join(", ") : "No Modules"}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              Q{currentQIndex + 1} / {TOTAL_QUESTIONS} • ID: {question.id}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Time</div>
            <div
              className={`font-mono font-black text-2xl ${
                urgency === "high" ? "text-red-400" : urgency === "med" ? "text-amber-300" : "text-slate-200"
              }`}
            >
              {minutes}:{seconds}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 w-full h-1 bg-slate-900">
        <motion.div
          className="h-full bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 p-6 max-w-2xl mx-auto flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {question.category}
              </span>
              <h2 className="text-xl md:text-2xl font-black leading-relaxed tracking-tight">{question.text}</h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Choose the best answer. This scan is tuned to your setup ({userState} • {classLabel(userLicense)}).
              </p>
            </div>

            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                const active = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      active
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                        : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black ${
                          active
                            ? "border-amber-500 bg-amber-500 text-black"
                            : "border-slate-700 text-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-sm md:text-base font-semibold leading-relaxed">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
              Updated for 2026 • Optimized for mobile • No account needed
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 p-6 border-t border-slate-800 bg-slate-950/70 backdrop-blur">
        <button
          onClick={commitAnswer}
          disabled={selectedOption === null}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            selectedOption === null
              ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
              : "bg-white text-black hover:bg-slate-200 shadow-lg active:scale-95"
          }`}
        >
          {currentQIndex === TOTAL_QUESTIONS - 1 ? "Complete Inspection" : "Confirm Selection"}
        </button>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          <button onClick={() => router.push("/")} className="underline hover:text-slate-300">
            Change setup
          </button>
          <span>Haul.OS • v6.0</span>
        </div>
      </div>
    </div>
  );
}
