// app/sim/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";
import { useRouter } from "next/navigation";

// --- Types ---
type Stage = "boot" | "quiz" | "analyzing" | "preview";

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

type UserConfig = {
  license: LicenseClass;
  endorsements: Endorsement[];
  userState: string;
};

const CONFIG_KEY = "haulOS.config.v1";

// --- Helpers ---
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function classLabel(cls: LicenseClass) {
  if (cls === "A") return "Class A (Combination / Semi)";
  if (cls === "B") return "Class B (Heavy Straight)";
  if (cls === "C") return "Class C (Passenger / Hazmat)";
  return "Class D (General)";
}

function formatEndorsements(list: Endorsement[]) {
  if (!list || list.length === 0) return "None";
  return list.join(", ");
}

function riskLabel(score: number) {
  if (score >= 80) return { label: "CLEAR", tone: "emerald" as const, msg: "You’re on track. Tighten weak spots to lock in your pass." };
  if (score >= 60) return { label: "ELEVATED", tone: "amber" as const, msg: "You’re close, but one weak domain can fail you on test day." };
  return { label: "HIGH", tone: "red" as const, msg: "Critical gaps detected. Your Fix Plan will remove the risk fast." };
}

function toneClasses(tone: "emerald" | "amber" | "red") {
  if (tone === "emerald") return { pill: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300", big: "text-emerald-300" };
  if (tone === "amber") return { pill: "bg-amber-500/10 border-amber-500/30 text-amber-300", big: "text-amber-300" };
  return { pill: "bg-red-500/10 border-red-500/30 text-red-300", big: "text-red-300" };
}

export default function DiagnosticPage() {
  const router = useRouter();

  // --- State ---
  const [stage, setStage] = useState<Stage>("boot");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Personalization
  const [config, setConfig] = useState<UserConfig>({
    license: "A",
    endorsements: [],
    userState: "TX",
  });

  // Animation State
  const [analysisText, setAnalysisText] = useState("INITIALIZING SYSTEM...");
  const [analysisPct, setAnalysisPct] = useState(0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes pressure
  const timeExpiredRef = useRef(false);

  const question = activeQuestions[currentQIndex];

  // --- INIT: Load Config & Filter Questions + Boot Sequence ---
  useEffect(() => {
    // 1) Load config (new + legacy)
    const saved = safeParseJSON<{ license: LicenseClass; endorsements: Endorsement[]; userState: string }>(
      localStorage.getItem(CONFIG_KEY)
    );

    const legacyLicense = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const legacyEndorsements = safeParseJSON<Endorsement[]>(localStorage.getItem("userEndorsements")) || [];
    const legacyState = localStorage.getItem("userState") || "TX";

    const license = saved?.license || (["A", "B", "C", "D"].includes(legacyLicense) ? legacyLicense : "A");
    const endorsements = Array.isArray(saved?.endorsements) ? saved!.endorsements : legacyEndorsements;
    const userState = typeof saved?.userState === "string" ? saved.userState : legacyState;

    const finalConfig: UserConfig = { license, endorsements, userState };
    setConfig(finalConfig);

    // Ensure legacy keys exist for downstream pages
    localStorage.setItem("userLevel", license);
    localStorage.setItem("userEndorsements", JSON.stringify(endorsements));
    localStorage.setItem("userState", userState);

    // 2) Filter question bank
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;

      // If question requires endorsement, user must have at least one of the required endorsements
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => endorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    // 3) Pick 5 for diagnostic
    const picked = shuffle(eligible).slice(0, 5);
    setActiveQuestions(picked.length > 0 ? picked : shuffle(questions).slice(0, 5));

    // 4) Cinematic boot sequence (personalized)
    setStage("boot");
    const seq = [
      { t: 450, pct: 18, text: `LOADING ${userState} DMV RULESET...` },
      { t: 950, pct: 38, text: `SYNCING ${classLabel(license).toUpperCase()} MODULE...` },
      { t: 1500, pct: 62, text: endorsements.length ? `ATTACHING ENDORSEMENTS: ${endorsements.join(", ").toUpperCase()}...` : "NO ENDORSEMENTS SELECTED. CONTINUING..." },
      { t: 2050, pct: 86, text: "CALIBRATING QUESTION DIFFICULTY..." },
      { t: 2600, pct: 100, text: "DIAGNOSTIC READY." },
    ];

    seq.forEach((s) => {
      setTimeout(() => {
        setAnalysisPct(s.pct);
        setAnalysisText(s.text);
      }, s.t);
    });

    setTimeout(() => setStage("quiz"), 2950);
  }, []);

  // --- Timer ---
  useEffect(() => {
    if (stage !== "quiz") return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        const next = Math.max(0, p - 1);
        if (next === 0) timeExpiredRef.current = true;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  // If time expires mid-question, force analysis (keeps pressure + conversion)
  useEffect(() => {
    if (stage !== "quiz") return;
    if (!question) return;
    if (timeLeft !== 0) return;

    // Commit as incorrect if they didn't answer
    if (selectedOption === null && !timeExpiredRef.current) return;

    const record: AnswerRecord = {
      id: question.id,
      category: question.category,
      isCorrect: false,
      text: question.text,
      options: question.options,
      explanation: question.explanation,
      selectedIndex: selectedOption ?? -1,
      correctIndex: question.correctIndex,
    };

    const finalAnswers = [...answers, record].slice(0, 5);
    runStopProtocol(finalAnswers, { timeoutTriggered: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // --- Derived ---
  const progressPct = useMemo(() => {
    return Math.round(((currentQIndex + 1) / 5) * 100);
  }, [currentQIndex]);

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

    if (currentQIndex >= 4) {
      runStopProtocol(newAnswers);
    } else {
      setCurrentQIndex((p) => p + 1);
      setSelectedOption(null);
    }
  };

  const runStopProtocol = (finalAnswers: AnswerRecord[], opts?: { timeoutTriggered?: boolean }) => {
    setStage("analyzing");

    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const score = Math.round((correct / 5) * 100);

    localStorage.setItem("diagnosticScore", score.toString());

    // Weakest domain: most missed category (fallback to first wrong)
    const wrongs = finalAnswers.filter((a) => !a.isCorrect);
    let weakDomain = "General Knowledge";
    if (wrongs.length > 0) {
      const tally = new Map<string, number>();
      wrongs.forEach((w) => tally.set(w.category, (tally.get(w.category) || 0) + 1));
      weakDomain = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0] || wrongs[0].category;
    }
    localStorage.setItem("weakestDomain", weakDomain);

    // Store a tiny “session” object for future use (dashboard, analytics)
    localStorage.setItem(
      "haulOS.lastDiagnostic.v1",
      JSON.stringify({
        at: Date.now(),
        state: config.userState,
        license: config.license,
        endorsements: config.endorsements,
        score,
        weakDomain,
      })
    );

    // Personalized industrial animation (feels “real”)
    const failLine = opts?.timeoutTriggered ? "TIMEOUT DETECTED — DRIVER HESITATION..." : "CRITICAL FAILURE DETECTED...";
    const seq = [
      { t: 600, pct: 18, text: `INGESTING ${config.userState} EXAM TELEMETRY...` },
      { t: 1400, pct: 38, text: `VERIFYING ${classLabel(config.license).toUpperCase()} COMPETENCY...` },
      { t: 2200, pct: 62, text: `SCANNING DOMAIN WEAKNESSES: ${weakDomain.toUpperCase()}...` },
      { t: 3100, pct: 82, text: failLine },
      { t: 4100, pct: 100, text: "DIAGNOSTIC LOCKED. FIX PLAN REQUIRED." },
    ];

    setAnalysisPct(0);
    setAnalysisText("INITIALIZING SYSTEM...");
    seq.forEach((s) => {
      setTimeout(() => {
        setAnalysisPct(s.pct);
        setAnalysisText(s.text);
      }, s.t);
    });

    setTimeout(() => {
      setStage("preview");
    }, 4600);
  };

  const restart = () => {
    // Keep config, reset session
    setAnswers([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setTimeLeft(300);
    timeExpiredRef.current = false;

    // repick 5 questions with the same rules
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(config.license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => config.endorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    const picked = shuffle(eligible).slice(0, 5);
    setActiveQuestions(picked.length > 0 ? picked : shuffle(questions).slice(0, 5));
    setStage("quiz");
  };

  // --- Views ---

  // 0) BOOT VIEW (personalized)
  if (stage === "boot") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Personalizing Diagnostic
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur p-6">
            <div className="text-4xl mb-3">🛰️</div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Booting {config.userState} Module</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Class: <span className="text-white font-bold">{config.license}</span> • Endorsements:{" "}
              <span className="text-white font-bold">{formatEndorsements(config.endorsements)}</span>
            </p>

            <div className="mt-6 text-left">
              <div className="flex justify-between text-xs text-slate-400 uppercase tracking-widest mb-2">
                <span>System Status</span>
                <span>{analysisPct}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisPct}%` }}
                />
              </div>
              <p className="mt-4 text-amber-300 font-mono font-bold text-xs">
                {">"} {analysisText}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono mt-6">
            🔒 No signup • Your config is saved on this device
          </p>
        </div>
      </div>
    );
  }

  // 1) ANALYZING VIEW (personalized)
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans text-center text-white">
        <div className="w-full max-w-md">
          <div className="text-amber-500 text-6xl mb-5 animate-pulse">⚠️</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">STOP PROTOCOL INITIATED</h2>
          <p className="text-sm text-slate-400 mb-8">
            {config.userState} • {classLabel(config.license)}
            {config.endorsements.length ? ` • ${config.endorsements.join(", ")}` : ""}
          </p>

          <div className="bg-slate-900/60 backdrop-blur border border-slate-700 p-6 rounded-3xl">
            <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase tracking-widest">
              <span>System Status</span>
              <span>{analysisPct}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${analysisPct}%` }}
              />
            </div>
            <p className="text-amber-300 font-bold text-xs font-mono">
              {">"} {analysisText}
            </p>

            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-left">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">State</div>
                <div className="text-sm font-bold">{config.userState}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Class</div>
                <div className="text-sm font-bold">{config.license}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Items</div>
                <div className="text-sm font-bold">{answers.length}/5</div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono mt-6">
            This is a practice diagnostic—not an official DMV exam.
          </p>
        </div>
      </div>
    );
  }

  // 2) PREVIEW / PAYWALL VIEW (stronger personalization)
  if (stage === "preview") {
    const missed = answers.find((a) => !a.isCorrect);
    const score = parseInt(localStorage.getItem("diagnosticScore") || "0", 10);
    const weakDomain = localStorage.getItem("weakestDomain") || "General Knowledge";
    const r = riskLabel(score);
    const tc = toneClasses(r.tone);

    // Use the real missed question explanation, but keep it “locked” without exposing the full content
    const correctLetter = missed ? String.fromCharCode(65 + missed.correctIndex) : "B";
    const selectedLetter =
      missed && missed.selectedIndex >= 0 ? String.fromCharCode(65 + missed.selectedIndex) : "—";

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center font-sans">
        <div className="w-full max-w-md">
          {/* Status Header */}
          <div className={`p-4 rounded-3xl mb-6 text-center border ${tc.pill}`}>
            <div className="font-black text-xs uppercase tracking-[0.22em] mb-1">
              {config.userState} Diagnostic • {classLabel(config.license)}
            </div>
            <div className="text-3xl font-black">
              RISK: <span className={tc.big}>{r.label}</span>
            </div>
            <div className="text-slate-200/90 text-sm mt-1">
              Readiness Score: <span className="font-black">{score}%</span> • Passing target:{" "}
              <span className="font-black">80%</span>
            </div>
            <p className="text-slate-300 text-xs mt-2">{r.msg}</p>
          </div>

          {/* Hook: Missed Question (personalized + real) */}
          {missed && (
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-3xl p-6 mb-5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Critical Failure Domain
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {weakDomain}
                </div>
              </div>

              <p className="text-white font-bold text-sm mt-4 leading-relaxed">{missed.text}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">You chose</div>
                  <div className="text-sm font-black text-slate-100">{selectedLetter}</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Correct</div>
                  <div className="text-sm font-black text-emerald-300">{correctLetter}</div>
                </div>
              </div>

              {/* Locked explanation */}
              <div className="relative mt-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                <div className="filter blur-sm select-none opacity-60 text-sm text-slate-300 leading-relaxed">
                  {missed.explanation} (Full rationale + the exact rule reference for {config.userState} is locked.)
                </div>

                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2">
                    <span>🔒</span>
                    <span className="text-xs font-black uppercase tracking-wider text-white">Fix Plan Locked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push("/pay")}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all active:scale-[0.99]"
          >
            Unlock Fix Plan & Pass →
          </button>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={restart}
              className="text-xs text-slate-500 underline hover:text-slate-300"
            >
              Restart Diagnostic
            </button>

            <button
              onClick={() => router.push("/")}
              className="text-xs text-slate-500 underline hover:text-slate-300"
            >
              Change options
            </button>
          </div>

          <p className="text-[10px] text-slate-600 font-mono mt-6 text-center">
            Secure checkout next • Instant access • Money-back option available on Pass Guarantee
          </p>
        </div>
      </div>
    );
  }

  // 3) QUIZ VIEW
  if (!question) return <div className="min-h-screen bg-slate-950" />;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* HUD Header */}
      <div className="relative z-20 px-6 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur flex justify-between items-center sticky top-0">
        <div className="min-w-0">
          <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            Diagnostic Active • {config.userState}
          </div>
          <div className="text-xs text-slate-400 font-mono truncate">
            {classLabel(config.license)} • Endorsements: {formatEndorsements(config.endorsements)} • Q{currentQIndex + 1}/5
          </div>
        </div>

        <div className="text-right font-mono font-black text-xl text-slate-100 tabular-nums">
          {minutes}:{seconds}
        </div>
      </div>

      {/* Progress Bar + micro text */}
      <div className="relative z-20">
        <div className="w-full h-1 bg-slate-900">
          <motion.div
            className="h-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="px-6 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest flex justify-between">
          <span>Adaptive set: {config.userState} • {config.license}</span>
          <span>{progressPct}%</span>
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 p-6 max-w-2xl mx-auto flex flex-col justify-center w-full">
        <div className="mb-6">
          <div class
