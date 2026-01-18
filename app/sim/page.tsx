// app/sim/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";
import { useRouter } from "next/navigation";

type Stage = "quiz" | "analyzing" | "preview";

type AnswerRecord = {
  id: number;
  category: string;
  isCorrect: boolean;
  text: string;
  options: string[];
  explanation: string;
  selectedIndex: number;
  correctIndex: number;
};

const TOTAL_QUESTIONS = 5;
const QUIZ_SECONDS = 300;

// Optional: future-proof config key (keep legacy compatibility)
const CONFIG_KEY = "haulOS.config.v1";

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

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
    };
  if (tone === "amber")
    return {
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      bar: "bg-amber-500",
    };
  return {
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    text: "text-red-300",
    bar: "bg-red-500",
  };
}

export default function DiagnosticPage() {
  const router = useRouter();

  // User config personalization
  const [userLicense, setUserLicense] = useState<LicenseClass>("A");
  const [userEndorsements, setUserEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");

  // Flow state
  const [stage, setStage] = useState<Stage>("quiz");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);

  // Analyzing animation
  const [analysisText, setAnalysisText] = useState("INITIALIZING SYSTEM...");
  const [analysisPct, setAnalysisPct] = useState(0);
  const analyzingTimers = useRef<number[]>([]);

  const question = activeQuestions[currentQIndex];

  const chips = useMemo(() => {
    const e = userEndorsements.length ? userEndorsements.join(", ") : "No modules";
    return `${userState} • ${classLabel(userLicense)} • ${e}`;
  }, [userEndorsements, userLicense, userState]);

  // INIT: Load user config + filter questions
  useEffect(() => {
    // Prefer new consolidated config if present
    const cfg = safeParseJSON<{
      license?: LicenseClass;
      endorsements?: Endorsement[];
      userState?: string;
    }>(localStorage.getItem(CONFIG_KEY));

    const legacyLicense = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const legacyEndorsements = safeParseJSON<Endorsement[]>(localStorage.getItem("userEndorsements")) || [];
    const legacyState = localStorage.getItem("userState") || "TX";

    const license = cfg?.license || legacyLicense || "A";
    const endorsements = Array.isArray(cfg?.endorsements) ? cfg!.endorsements! : legacyEndorsements;
    const st = cfg?.userState || legacyState || "TX";

    setUserLicense(license);
    setUserEndorsements(endorsements);
    setUserState(st);

    // Filter question bank by license + required endorsement(s)
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        // If question requires endorsement, user must have at least one required item (your current logic)
        const hasRequired = q.endorsements.some((req) => endorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    // Pick TOTAL_QUESTIONS, fallback safely
    const picked = shuffle(eligible).slice(0, TOTAL_QUESTIONS);

    // If not enough eligible, fill from general pool (unique by id)
    if (picked.length < TOTAL_QUESTIONS) {
      const pool = shuffle(questions).filter((q) => !picked.some((p) => p.id === q.id));
      while (picked.length < TOTAL_QUESTIONS && pool.length) picked.push(pool.shift()!);
    }

    setActiveQuestions(picked.length ? picked : questions.slice(0, TOTAL_QUESTIONS));
  }, []);

  // Timer tick
  useEffect(() => {
    if (stage !== "quiz") return;
    const t = window.setInterval(() => {
      setTimeLeft((p) => Math.max(0, p - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  // Auto-stop if time runs out
  useEffect(() => {
    if (stage !== "quiz") return;
    if (timeLeft > 0) return;

    // Treat remaining unanswered as wrong (score vs TOTAL_QUESTIONS)
    runStopProtocol(answers, { timedOut: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, stage]);

  const restart = () => {
    // Clear timers
    analyzingTimers.current.forEach((id) => window.clearTimeout(id));
    analyzingTimers.current = [];

    setStage("quiz");
    setAnswers([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setTimeLeft(QUIZ_SECONDS);

    // Re-pick questions (keep personalization)
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(userLicense)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => userEndorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    const picked = shuffle(eligible).slice(0, TOTAL_QUESTIONS);
    if (picked.length < TOTAL_QUESTIONS) {
      const pool = shuffle(questions).filter((q) => !picked.some((p) => p.id === q.id));
      while (picked.length < TOTAL_QUESTIONS && pool.length) picked.push(pool.shift()!);
    }
    setActiveQuestions(picked.length ? picked : questions.slice(0, TOTAL_QUESTIONS));
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

    // Score: correct / TOTAL_QUESTIONS (unanswered count as wrong)
    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const score = Math.round((correct / TOTAL_QUESTIONS) * 100);

    // Weakest domain: first wrong answer, else "General Knowledge"
    const wrong = finalAnswers.find((a) => !a.isCorrect);
    const weakDomain = wrong ? wrong.category : "General Knowledge";

    // Persist for paywall / dashboard
    localStorage.setItem("diagnosticScore", String(score));
    localStorage.setItem("weakestDomain", weakDomain);
    localStorage.setItem("diagnosticAnswers", JSON.stringify(finalAnswers));
    localStorage.setItem("diagnosticTimedOut", opts.timedOut ? "1" : "0");

    // Kick off analyzing animation (personalized)
    const seq = [
      { t: 600, pct: 12, text: `LOADING ${userState} EXAM PROFILE...` },
      { t: 1400, pct: 28, text: `SYNCING ${classLabel(userLicense).toUpperCase()} MODULES...` },
      { t: 2200, pct: 46, text: `SCANNING WEAKNESS: ${weakDomain.toUpperCase()}...` },
      { t: 3000, pct: 65, text: `CALCULATING PASS PROBABILITY...` },
      { t: 3800, pct: 84, text: opts.timedOut ? `TIME EXPIRED — SAFETY STOP...` : `CRITICAL FAILURE DETECTED...` },
      { t: 4600, pct: 100, text: `EXAM STOPPED.` },
    ];

    setAnalysisPct(0);
    setAnalysisText("INITIALIZING SYSTEM...");

    analyzingTimers.current.forEach((id) => window.clearTimeout(id));
    analyzingTimers.current = [];

    seq.forEach((step) => {
      const id = window.setTimeout(() => {
        setAnalysisPct(step.pct);
        setAnalysisText(step.text);
      }, step.t);
      analyzingTimers.current.push(id);
    });

    const doneId = window.setTimeout(() => {
      setStage("preview");
    }, 5200);

    analyzingTimers.current.push(doneId);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // ---------------------------
  // VIEW 1: ANALYZING
  // ---------------------------
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-widest">
              System Scan • {userState} • {classLabel(userLicense)}
            </div>
            <div className="mt-4 text-6xl animate-pulse">⚠️</div>
            <h2 className="mt-4 text-3xl font-black tracking-tighter">STOP PROTOCOL</h2>
            <p className="mt-2 text-xs font-mono text-slate-500 uppercase tracking-widest">{chips}</p>
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
    const score = parseInt(localStorage.getItem("diagnosticScore") || "0", 10);
    const missed = answers.find((a) => !a.isCorrect);
    const timedOut = localStorage.getItem("diagnosticTimedOut") === "1";

    const risk = riskFromScore(score);
    const tc = toneClasses(risk.tone);

    const missing = Math.max(0, 80 - score);

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center font-sans">
        <div className="w-full max-w-md">
          {/* Status Header */}
          <div className={`rounded-3xl p-5 border ${tc.border} ${tc.bg} text-center`}>
            <div className={`font-black text-xs uppercase tracking-[0.2em] mb-1 ${tc.text}`}>
              Status: {risk.label === "CLEAR" ? "Cleared" : "Grounded"}
            </div>
            <div className="text-3xl font-black">RISK LEVEL: {risk.label}</div>
            <div className="text-slate-300 text-sm mt-1">
              Readiness Score: <span className={`font-black ${tc.text}`}>{score}%</span>
              {risk.label !== "CLEAR" && (
                <span className="text-slate-400"> • Need +{missing}% to hit 80%</span>
              )}
            </div>
            <div className="mt-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">{chips}</div>
            {timedOut && (
              <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-300">
                Time expired — this is exactly how the real test feels.
              </div>
            )}
          </div>

          {/* Hook: Missed Question */}
          {missed ? (
            <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.25),transparent_60%)]" />
              <div className="relative">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Critical Failure: {missed.category}
                </div>

                <p className="text-white font-bold text-sm leading-relaxed">{missed.text}</p>

                <div className="mt-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 relative">
                  <div className="filter blur-sm select-none opacity-60 text-sm text-slate-200 leading-relaxed">
                    {missed.explanation} (You picked {String.fromCharCode(65 + missed.selectedIndex)} — correct is{" "}
                    {String.fromCharCode(65 + missed.correctIndex)}.)
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2">
                      <span>🔒</span>
                      <span className="text-xs font-black uppercase tracking-wider">Fix Plan Locked</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Unlock to see the rule + drill it until it sticks (fastest score lift).
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-center">
              <div className="text-emerald-300 text-4xl mb-2">✅</div>
              <div className="text-lg font-black">No failures detected in this scan.</div>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                That’s great — now make it <span className="text-white font-bold">repeatable</span>. Unlock full simulator + timed reps to keep 80%+
                on demand.
              </p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push("/pay")}
            className="mt-6 w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-widest shadow-[0_0_40px_-12px_rgba(245,158,11,0.6)] transition-transform active:scale-95"
          >
            Unlock Fix Plan & Pass →
          </button>

          <div className="mt-4 flex items-center justify-between">
            <button onClick={restart} className="text-xs text-slate-500 underline hover:text-slate-300">
              Restart Diagnostic
            </button>
            <button onClick={() => router.push("/")} className="text-xs text-slate-500 underline hover:text-slate-300">
              Change setup
            </button>
          </div>

          <div className="mt-5 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            🔒 No credit card stored here • Stripe secure checkout
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // VIEW 3: QUIZ
  // ---------------------------
  if (!question) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* HUD Header */}
      <div className="relative z-20 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Diagnostic Active • {userState}
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
            <div className="font-mono font-black text-2xl text-slate-200">
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
      <div className="relative z-10 flex-1 p-6 max-w-2xl mx-auto flex flex-col justify-center">
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
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black ${
                      active ? "border-amber-500 bg-amber-500 text-black" : "border-slate-700 text-slate-300"
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

        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          Updated for 2026 • Optimized for mobile • No account needed
        </div>
      </div>
    </div>
  );
}
