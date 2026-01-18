"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";
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
  selectedIndex: number; // -1 if unanswered (timer ran out)
  correctIndex: number;
};

type DiagnosticMeta = {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  license: LicenseClass;
  state: string;
  endorsements: Endorsement[];
  timeLimitSec: number;
  timeUsedSec: number;
};

type CategoryBreakdown = Record<
  string,
  { total: number; correct: number; accuracy: number }
>;

// -------------------- CONSTANTS --------------------
const STORAGE_KEYS = {
  userLevel: "userLevel",
  userState: "userState",
  userEndorsements: "userEndorsements",

  diagnosticScore: "diagnosticScore",
  weakestDomain: "weakestDomain",
  diagnosticAnswers: "haul_diagnostic_answers",
  diagnosticBreakdown: "haul_diagnostic_breakdown",
  diagnosticMeta: "haul_diagnostic_meta",
  diagnosticStartedAt: "haul_diagnostic_started_at",
  sessionId: "haul_session_id",
};

const TIME_LIMIT_SEC = 300; // 5 min

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
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatEndorsements(ends: Endorsement[]) {
  if (!ends.length) return "No endorsements";
  return ends.join(" • ");
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

  // Lowest accuracy; tie-breaker: higher total (more evidence)
  entries.sort((a, b) => {
    const aa = a[1].accuracy - b[1].accuracy;
    if (aa !== 0) return aa;
    return b[1].total - a[1].total;
  });

  return entries[0][0] || "General Knowledge";
}

function statusFromScore(score: number) {
  if (score >= 80) return { label: "Road Ready", tone: "green", risk: "LOW" };
  if (score >= 60) return { label: "Inspection Pending", tone: "amber", risk: "MED" };
  return { label: "Grounded", tone: "red", risk: "HIGH" };
}

// -------------------- COMPONENT --------------------
export default function DiagnosticPage() {
  const router = useRouter();

  // Core stage
  const [stage, setStage] = useState<Stage>("quiz");

  // Personalization (loaded from landing config)
  const [license, setLicense] = useState<LicenseClass>("A");
  const [userState, setUserState] = useState("TX");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Quiz state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SEC);

  // Analyzing animation state
  const [analysisText, setAnalysisText] = useState("INITIALIZING SYSTEM…");
  const [analysisPct, setAnalysisPct] = useState(0);

  // Preview state (avoid reading localStorage in render)
  const [finalScore, setFinalScore] = useState(0);
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [finalBreakdown, setFinalBreakdown] = useState<CategoryBreakdown>({});
  const [missed, setMissed] = useState<AnswerRecord | null>(null);

  const timeoutsRef = useRef<number[]>([]);
  const quizStartTsRef = useRef<number>(Date.now());

  const question = activeQuestions[currentQIndex];

  // -------------------- INIT: load config + build question set --------------------
  useEffect(() => {
    const sid = safeGet(STORAGE_KEYS.sessionId);
    if (!sid) safeSet(STORAGE_KEYS.sessionId, makeSessionId());

    const lic = (safeGet(STORAGE_KEYS.userLevel) as LicenseClass | null) || "A";
    const st = safeGet(STORAGE_KEYS.userState) || "TX";
    const ends = safeJsonParse<Endorsement[]>(safeGet(STORAGE_KEYS.userEndorsements), []);

    setLicense(lic);
    setUserState(st);
    setEndorsements(Array.from(new Set(ends)));
    setConfigLoaded(true);

    // Mark diagnostic started if not already
    const startedAt = safeGet(STORAGE_KEYS.diagnosticStartedAt);
    if (!startedAt) safeSet(STORAGE_KEYS.diagnosticStartedAt, new Date().toISOString());

    // Build eligible pool
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(lic)) return false;

      if (q.endorsements && q.endorsements.length > 0) {
        // must have at least one required endorsement present
        const hasRequired = q.endorsements.some((req) => ends.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    // Pick 5 questions, but try to avoid all-from-one-category if possible
    const shuffled = shuffle(eligible.length ? eligible : questions);
    const picked: Question[] = [];

    const seenCats = new Set<string>();
    for (const q of shuffled) {
      if (picked.length >= 5) break;
      // Prefer new categories first
      if (!seenCats.has(q.category) || picked.length >= 3) {
        picked.push(q);
        seenCats.add(q.category);
      }
    }
    while (picked.length < 5 && shuffled[picked.length]) picked.push(shuffled[picked.length]);

    setActiveQuestions(picked.slice(0, 5));
    quizStartTsRef.current = Date.now();
  }, []);

  // -------------------- TIMER --------------------
  useEffect(() => {
    if (stage !== "quiz") return;

    const t = window.setInterval(() => {
      setTimeLeft((p) => Math.max(0, p - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [stage]);

  // Auto-stop when time hits 0
  useEffect(() => {
    if (stage !== "quiz") return;
    if (timeLeft !== 0) return;

    // finalize with unanswered marked wrong
    const finalAnswers: AnswerRecord[] = [...answers];

    for (let i = currentQIndex; i < activeQuestions.length; i++) {
      const q = activeQuestions[i];
      if (!q) continue;
      finalAnswers.push({
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

    runStopProtocol(finalAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // -------------------- KEYBOARD SUPPORT (mobile users still benefit w/ BT keyboard) --------------------
  useEffect(() => {
    if (stage !== "quiz") return;

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === "1" || k === "a") setSelectedOption(0);
      if (k === "2" || k === "b") setSelectedOption(1);
      if (k === "3" || k === "c") setSelectedOption(2);
      if (k === "4" || k === "d") setSelectedOption(3);

      if (k === "enter") {
        // only commit if selection exists
        if (selectedOption !== null) commitAnswer();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedOption, question, currentQIndex, answers]);

  // -------------------- MAIN LOGIC --------------------
  const commitAnswer = () => {
    if (!question) return;
    if (selectedOption === null) return;

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

  const clearAllTimeouts = () => {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current = [];
  };

  const runStopProtocol = (finalAnswers: AnswerRecord[]) => {
    // prevent double-run
    if (stage !== "quiz") return;

    setStage("analyzing");
    clearAllTimeouts();

    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const score = Math.round((correct / 5) * 100);
    const breakdown = computeBreakdown(finalAnswers);
    const weakest = pickWeakestDomain(breakdown);

    // Save for paywall/dashboard
    safeSet(STORAGE_KEYS.diagnosticScore, String(score));
    safeSet(STORAGE_KEYS.weakestDomain, weakest);
    safeSet(STORAGE_KEYS.diagnosticAnswers, JSON.stringify(finalAnswers));
    safeSet(STORAGE_KEYS.diagnosticBreakdown, JSON.stringify(breakdown));

    const sid = safeGet(STORAGE_KEYS.sessionId) || makeSessionId();
    const startedAt = safeGet(STORAGE_KEYS.diagnosticStartedAt) || new Date().toISOString();
    const completedAt = new Date().toISOString();
    const timeUsedSec = clamp(Math.round((Date.now() - quizStartTsRef.current) / 1000), 0, TIME_LIMIT_SEC);

    const meta: DiagnosticMeta = {
      sessionId: sid,
      startedAt,
      completedAt,
      license,
      state: userState,
      endorsements,
      timeLimitSec: TIME_LIMIT_SEC,
      timeUsedSec,
    };
    safeSet(STORAGE_KEYS.diagnosticMeta, JSON.stringify(meta));

    // Set preview state now (so preview view is immediate + personalized)
    setFinalScore(score);
    setWeakDomain(weakest);
    setFinalBreakdown(breakdown);

    // Pick a "missed" question to tease (prefer the weakest category, else any missed)
    const missedInWeak = finalAnswers.find((a) => !a.isCorrect && a.category === weakest) || finalAnswers.find((a) => !a.isCorrect) || null;
    setMissed(missedInWeak);

    // Million-dollar analyzing sequence (personalized)
    const profileLine = `PROFILE: CLASS ${license} • ${userState} • ${endorsements.length ? `${endorsements.length} MODULES` : "CORE ONLY"}`;

    const sequence = [
      { t: 250, pct: 10, text: "HANDSHAKE ESTABLISHED…" },
      { t: 900, pct: 22, text: profileLine },
      { t: 1600, pct: 40, text: "LOADING DMV PATTERNS + FEDERAL CORE…" },
      { t: 2400, pct: 58, text: `SCANNING WEAK POINTS: ${weakest.toUpperCase()}…` },
      { t: 3300, pct: 76, text: "CALCULATING PASS PROBABILITY…" },
      { t: 4200, pct: 90, text: "LOCKING DIAGNOSTIC RESULTS…" },
      { t: 5200, pct: 100, text: "EXAM STOPPED." },
    ];

    for (const step of sequence) {
      const id = window.setTimeout(() => {
        setAnalysisPct(step.pct);
        setAnalysisText(step.text);
      }, step.t);
      timeoutsRef.current.push(id);
    }

    const doneId = window.setTimeout(() => {
      setStage("preview");
    }, 5850);
    timeoutsRef.current.push(doneId);
  };

  const restartDiagnostic = () => {
    // Keep the user's setup, reset only diagnostic state
    safeSet(STORAGE_KEYS.diagnosticScore, "0");
    safeSet(STORAGE_KEYS.weakestDomain, "General Knowledge");
    safeSet(STORAGE_KEYS.diagnosticAnswers, "[]");
    safeSet(STORAGE_KEYS.diagnosticBreakdown, "{}");
    safeSet(STORAGE_KEYS.diagnosticStartedAt, new Date().toISOString());

    // Soft reset in place (no full page reload needed)
    setStage("quiz");
    setAnswers([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setTimeLeft(TIME_LIMIT_SEC);
    quizStartTsRef.current = Date.now();

    // re-pick questions using same logic
    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => endorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });
    const shuffled = shuffle(eligible.length ? eligible : questions);
    const picked: Question[] = [];

    const seenCats = new Set<string>();
    for (const q of shuffled) {
      if (picked.length >= 5) break;
      if (!seenCats.has(q.category) || picked.length >= 3) {
        picked.push(q);
        seenCats.add(q.category);
      }
    }
    while (picked.length < 5 && shuffled[picked.length]) picked.push(shuffled[picked.length]);

    setActiveQuestions(picked.slice(0, 5));
  };

  // -------------------- UI: COMMON BITS --------------------
  const headerProfile = useMemo(() => {
    const ends = endorsements.length ? `${endorsements.length} modules` : "core only";
    return `Class ${license} • ${userState} • ${ends}`;
  }, [license, userState, endorsements]);

  const timeLabel = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`;
  const urgency = timeLeft <= 60 ? "high" : timeLeft <= 120 ? "med" : "low";

  // -------------------- VIEW: ANALYZING --------------------
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        {/* Background FX */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-20 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.88)_75%)]" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                STOP PROTOCOL • DIAGNOSTIC LOCK
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight leading-none">
                Exam Engine is <span className="text-amber-500">Analyzing</span>
              </h2>
              <p className="mt-2 text-xs text-slate-400 font-mono">
                {headerProfile.toUpperCase()}
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-2">
                <span>System Status</span>
                <span>{analysisPct}%</span>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.6 }}
                />
              </div>

              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
                <div className="text-[11px] font-mono text-amber-300 tracking-widest">
                  {">"} <span className="font-black">{analysisText}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                    <div className="text-slate-500">MODE</div>
                    <div className="text-white font-black">DMV</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                    <div className="text-slate-500">STATE</div>
                    <div className="text-white font-black">{userState}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                    <div className="text-slate-500">CLASS</div>
                    <div className="text-white font-black">{license}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center text-[10px] text-slate-500 font-mono">
                Do not close this tab • Results are being sealed
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- VIEW: PREVIEW --------------------
  if (stage === "preview") {
    const status = statusFromScore(finalScore);
    const tone =
      status.tone === "green"
        ? {
            badge: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
            title: "text-emerald-300",
            big: "text-emerald-400",
            sub: "text-emerald-200",
          }
        : status.tone === "amber"
        ? {
            badge: "bg-amber-500/10 border-amber-500/40 text-amber-300",
            title: "text-amber-300",
            big: "text-amber-400",
            sub: "text-amber-200",
          }
        : {
            badge: "bg-red-500/10 border-red-500/40 text-red-300",
            title: "text-red-300",
            big: "text-red-400",
            sub: "text-red-200",
          };

    const breakdownEntries = Object.entries(finalBreakdown).sort(
      (a, b) => a[1].accuracy - b[1].accuracy
    );

    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans pb-28">
        {/* Background FX */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute top-24 -left-40 w-[520px] h-[520px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.5),transparent_65%)]" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-15 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.9)_75%)]" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-10">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase ${tone.badge}`}>
              RESULT SEALED • {headerProfile.toUpperCase()}
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight leading-none">
              Status: <span className={tone.title}>{status.label}</span>
            </h1>

            <div className="mt-3 text-slate-400 text-sm">
              Readiness Score:{" "}
              <span className={`font-black ${tone.big}`}>{finalScore}%</span>{" "}
              <span className="text-slate-500">•</span>{" "}
              Risk Level: <span className={`font-black ${tone.sub}`}>{status.risk}</span>
            </div>
          </div>

          {/* Breakdown (feels customized) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black text-slate-200 uppercase tracking-widest">
                Diagnostic Breakdown
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Targets: {weakDomain}
              </div>
            </div>

            <div className="space-y-2">
              {breakdownEntries.slice(0, 4).map(([cat, v]) => (
                <div key={cat} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-black text-white">{cat}</div>
                    <div className="text-xs font-mono text-slate-300">
                      {v.correct}/{v.total} • {v.accuracy}%
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        v.accuracy >= 80
                          ? "bg-emerald-500"
                          : v.accuracy >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${clamp(v.accuracy, 0, 100)}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Teaser: missed question with REAL locked rationale */}
          {missed && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 mb-4 relative overflow-hidden">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Priority Fix • {missed.category}
              </div>

              <p className="text-white font-black text-sm leading-relaxed">
                {missed.text}
              </p>

              <div className="mt-4 relative bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div className="filter blur-sm select-none opacity-50 text-sm text-slate-200 leading-relaxed">
                  Correct answer:{" "}
                  <span className="font-black">
                    {String.fromCharCode(65 + missed.correctIndex)}
                  </span>{" "}
                  — {missed.options[missed.correctIndex]}.{" "}
                  {missed.selectedIndex === -1 ? (
                    <span>You did not answer before the timer hit 0.</span>
                  ) : (
                    <span>
                      You selected{" "}
                      <span className="font-black">
                        {String.fromCharCode(65 + missed.selectedIndex)}
                      </span>{" "}
                      — {missed.options[missed.selectedIndex]}.
                    </span>
                  )}{" "}
                  Explanation: {missed.explanation}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                    <span>🔒</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white">
                      Fix Plan Locked
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">
                    Your Target
                  </div>
                  <div className="text-white font-black mt-1">{weakDomain}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-slate-500 font-mono uppercase tracking-widest text-[10px]">
                    Unlock Includes
                  </div>
                  <div className="text-white font-black mt-1">Explanations + Simulator</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/")}
              className="py-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 text-white font-black uppercase tracking-widest text-sm transition-transform active:scale-95"
            >
              Change Setup
            </button>
            <button
              onClick={restartDiagnostic}
              className="py-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 text-white font-black uppercase tracking-widest text-sm transition-transform active:scale-95"
            >
              Run Again
            </button>
          </div>

          {/* Sticky CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
            <div className="max-w-lg mx-auto">
              <button
                onClick={() => router.push("/pay")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95"
              >
                Unlock Fix Plan & Full Simulator →
              </button>
              <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
                Instant access • Secure checkout • No account needed
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- VIEW: QUIZ --------------------
  if (!question) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-amber-500 text-5xl mb-4">⏳</div>
          <div className="text-2xl font-black">Loading Diagnostic…</div>
          <div className="mt-2 text-sm text-slate-400">
            Calibrating for your setup.
          </div>

          {configLoaded ? (
            <div className="mt-6 text-[11px] font-mono text-slate-500">
              {headerProfile.toUpperCase()}
            </div>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-black uppercase tracking-widest text-sm"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.90)_75%)]" />
      </div>

      {/* HUD Header */}
      <div className="relative z-20 px-5 py-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Diagnostic Active • Calibrated
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              {headerProfile.toUpperCase()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Q{currentQIndex + 1}/5 • ID:{question.id} • {question.category}
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black font-mono ${
                urgency === "high"
                  ? "text-red-400"
                  : urgency === "med"
                  ? "text-amber-300"
                  : "text-slate-200"
              }`}
            >
              {timeLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              time remaining
            </div>
          </div>
        </div>

        {/* Tiny modules line */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-slate-300">
            CLASS {license}
          </span>
          <span className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-slate-300">
            STATE {userState}
          </span>
          <span className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-slate-300">
            {endorsements.length ? `MODULES: ${endorsements.length}` : "MODULES: 0"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 w-full h-1 bg-slate-900">
        <motion.div
          className="h-full bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQIndex + 1) / 5) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 p-5 max-w-2xl mx-auto flex flex-col justify-center w-full">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-black text-slate-200 uppercase tracking-widest">
              {question.category}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              select A–D • Enter to confirm
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black leading-relaxed tracking-tight">
            {question.text}
          </h2>
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
                    ? "bg-amber-500/10 border-amber-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.20)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center text-[11px] font-black ${
                      active
                        ? "border-amber-500 bg-amber-500 text-black"
                        : "border-slate-700 text-slate-300"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm md:text-base font-semibold leading-relaxed">
                      {opt}
                    </div>
                    {active && (
                      <div className="mt-2 text-[10px] font-mono text-amber-300 uppercase tracking-widest">
                        selection armed
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Micro reassurance */}
        <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
          Your setup is saved • This diagnostic is only 5 questions • Results unlock your Fix Plan
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-20 p-5 border-t border-slate-800 bg-slate-950/65 backdrop-blur">
        <button
          onClick={commitAnswer}
          disabled={selectedOption === null}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-transform active:scale-95 ${
            selectedOption === null
              ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
              : "bg-white text-black hover:bg-slate-200 shadow-lg"
          }`}
        >
          {currentQIndex === 4 ? "Complete Diagnostic →" : "Confirm Selection →"}
        </button>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <button
            onClick={() => router.push("/")}
            className="underline hover:text-slate-400"
          >
            Change setup
          </button>
          <span>
            {endorsements.length ? formatEndorsements(endorsements).toUpperCase() : "CORE ONLY"}
          </span>
        </div>
      </div>
    </div>
  );
}
