// app/sim/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

type CategoryBreakdown = Record<string, { total: number; correct: number; accuracy: number }>;

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

const PASSING_SCORE = 80;
const TIME_LIMIT_SEC = 300; // 5 min

const STATE_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
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
  if (!ends.length) return "None";
  return ends.join(", ");
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
    const aa = a[1].accuracy - b[1].accuracy;
    if (aa !== 0) return aa;
    return b[1].total - a[1].total;
  });
  return entries[0][0] || "General Knowledge";
}
function statusFromScore(score: number) {
  if (score >= PASSING_SCORE) return { label: "PASS READY", tone: "green", risk: "LOW" };
  if (score >= 60) return { label: "NOT READY", tone: "amber", risk: "MED" };
  return { label: "HIGH RISK", tone: "red", risk: "HIGH" };
}

// -------------------- COMPONENT --------------------
export default function DiagnosticPage() {
  const router = useRouter();

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
  const [analysisText, setAnalysisText] = useState("ANALYZING ANSWERS…");
  const [analysisPct, setAnalysisPct] = useState(0);

  // Preview state
  const [finalScore, setFinalScore] = useState(0);
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [finalBreakdown, setFinalBreakdown] = useState<CategoryBreakdown>({});
  const [missedList, setMissedList] = useState<AnswerRecord[]>([]);

  const timeoutsRef = useRef<number[]>([]);
  const quizStartTsRef = useRef<number>(Date.now());

  const question = activeQuestions[currentQIndex];

  // -------------------- INIT --------------------
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

    const startedAt = safeGet(STORAGE_KEYS.diagnosticStartedAt);
    if (!startedAt) safeSet(STORAGE_KEYS.diagnosticStartedAt, new Date().toISOString());

    const eligible = questions.filter((q) => {
      if (!q.licenseClasses.includes(lic)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some((req) => ends.includes(req));
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
    quizStartTsRef.current = Date.now();
  }, []);

  // -------------------- TIMER --------------------
  useEffect(() => {
    if (stage !== "quiz") return;
    const t = window.setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "quiz") return;
    if (timeLeft !== 0) return;

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

  // -------------------- KEYBOARD SUPPORT --------------------
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
    if (stage !== "quiz") return;

    setStage("analyzing");
    clearAllTimeouts();

    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const score = Math.round((correct / 5) * 100);
    const breakdown = computeBreakdown(finalAnswers);
    const weakest = pickWeakestDomain(breakdown);

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

    setFinalScore(score);
    setWeakDomain(weakest);
    setFinalBreakdown(breakdown);

    const missed = finalAnswers.filter((a) => !a.isCorrect);
    const missedSorted = missed
      .sort((a, b) => (a.category === weakest ? -1 : 1) - (b.category === weakest ? -1 : 1))
      .slice(0, 3);
    setMissedList(missedSorted);

    const stateName = STATE_NAME[userState] || userState;
    const profileLine = `CLASS ${license} • ${stateName.toUpperCase()} • ${endorsements.length ? `${endorsements.length} MODULES` : "CORE"}`;

    // Faster “feels instant” sequence (no slow “saving” vibe)
    const sequence = [
      { t: 80, pct: 12, text: "ANALYZING ANSWERS…" },
      { t: 260, pct: 32, text: `DMV PROFILE: ${profileLine}` },
      { t: 520, pct: 54, text: "CALCULATING SCORE…" },
      { t: 820, pct: 74, text: `WEAK TOPIC: ${weakest.toUpperCase()}…` },
      { t: 1120, pct: 90, text: "BUILDING YOUR NEXT STEPS…" },
      { t: 1400, pct: 100, text: "DONE." },
    ];

    for (const step of sequence) {
      const id = window.setTimeout(() => {
        setAnalysisPct(step.pct);
        setAnalysisText(step.text);
      }, step.t);
      timeoutsRef.current.push(id);
    }

    const doneId = window.setTimeout(() => setStage("preview"), 1580);
    timeoutsRef.current.push(doneId);
  };

  // -------------------- UI HELPERS --------------------
  const stateName = useMemo(() => STATE_NAME[userState] || userState, [userState]);
  const headerProfile = useMemo(() => {
    const ends = endorsements.length ? `${endorsements.length} modules` : "core";
    return `${classLabel(license)} • ${stateName} • ${ends}`;
  }, [license, stateName, endorsements]);

  const timeLabel = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`;
  const urgency = timeLeft <= 60 ? "high" : timeLeft <= 120 ? "med" : "low";

  const goPay = (plan?: "monthly" | "lifetime") => {
    const recommended = finalScore >= PASSING_SCORE ? "monthly" : "lifetime";
    const p = plan || recommended;
    router.push(`/pay?plan=${p}`);
  };

  const LockOverlay = ({ title, sub }: { title: string; sub: string }) => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
        <span>🔒</span>
        <div className="leading-tight">
          <div className="text-[10px] font-black uppercase tracking-widest text-white">{title}</div>
          <div className="text-[10px] text-slate-300">{sub}</div>
        </div>
      </div>
    </div>
  );

  // -------------------- VIEW: ANALYZING --------------------
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans">
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
                DMV QUICK DIAGNOSTIC
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight leading-none">
                <span className="text-amber-500">Analyzing</span> answers…
              </h2>
              <p className="mt-2 text-xs text-slate-400 font-mono">{headerProfile.toUpperCase()}</p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  DMV
                </span>
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  {classLabel(license)}
                </span>
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-200">
                  {stateName.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-2">
                <span>Status</span>
                <span>{analysisPct}%</span>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.35 }}
                />
              </div>

              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
                <div className="text-[11px] font-mono text-amber-300 tracking-widest">
                  {">"} <span className="font-black">{analysisText}</span>
                </div>
              </div>

              <div className="mt-5 text-center text-[10px] text-slate-500 font-mono">
                Do not close this tab
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
    const willFail = finalScore < PASSING_SCORE;
    const missing = Math.max(0, PASSING_SCORE - finalScore);
    const totalCorrect = Math.round((finalScore / 100) * 5);
    const totalMissed = Math.max(0, 5 - totalCorrect);

    const tone =
      status.tone === "green"
        ? {
            badge: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
            big: "text-emerald-400",
            bar: "bg-emerald-500",
          }
        : status.tone === "amber"
        ? {
            badge: "bg-amber-500/10 border-amber-500/40 text-amber-300",
            big: "text-amber-400",
            bar: "bg-amber-500",
          }
        : {
            badge: "bg-red-500/10 border-red-500/40 text-red-300",
            big: "text-red-400",
            bar: "bg-red-500",
          };

    const breakdownEntries = Object.entries(finalBreakdown).sort((a, b) => a[1].accuracy - b[1].accuracy);

    const unlockBullets = [
      "Unlimited CDL Practice Tests",
      "6,000+ Real Questions & Answers",
      "Fast Track Mode (Save Time)",
      "Full Simulator of Real Exam Access",
      "All 50 States Included",
      "Works Offline (Study at rest stops)",
      "100% Pass Guarantee",
    ];

    const primaryCta = willFail ? "Get CDL Practice Tests (6,000+ Q&A) →" : "Keep Practicing Until 80%+ →";
    const ctaSub = "All 50 States • Works Offline • 12,000+ drivers"";

    const IdCard = () => (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.35),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Driver Study Card</div>
              <div className="mt-1 text-sm font-black text-white">
                {classLabel(license)} • {stateName}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Endorsements: <span className="text-slate-200 font-bold">{formatEndorsements(endorsements)}</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${tone.badge}`}>
              {status.label}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Score</div>
              <div className={`text-2xl font-black ${tone.big}`}>{finalScore}%</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Need</div>
              <div className={`text-2xl font-black ${willFail ? "text-red-300" : "text-emerald-300"}`}>
                {willFail ? `${missing}%` : "0%"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Missed</div>
              <div className="text-2xl font-black text-white">{totalMissed}/5</div>
            </div>
          </div>
        </div>
      </motion.div>
    );

    const MissedPreview = ({ item }: { item: AnswerRecord }) => {
      const correctLetter = String.fromCharCode(65 + item.correctIndex);
      const chosenLetter = item.selectedIndex >= 0 ? String.fromCharCode(65 + item.selectedIndex) : "—";

      return (
        <button
          onClick={() => goPay()}
          className="w-full text-left rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 relative overflow-hidden hover:border-slate-700 transition"
          aria-label="Open paywall"
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 mb-2">
            You missed this • {item.category}
          </div>

          <div className="font-black text-white text-sm leading-relaxed">{item.text}</div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Correct</div>
              <div className="text-emerald-300 font-black text-lg">{correctLetter}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">You picked</div>
              <div className={`font-black text-lg ${item.isCorrect ? "text-emerald-300" : "text-red-300"}`}>{chosenLetter}</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 relative overflow-hidden">
            <div className="filter blur-sm select-none opacity-60 text-[12px] text-slate-200 leading-relaxed">
              Explanation: {item.explanation}
            </div>
            <LockOverlay title="See full answers + why" sub="Get unlimited CDL practice tests" />
          </div>
        </button>
      );
    };

    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans pb-32">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-15 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.9)_75%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-10">
          <div className="mb-4 text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase ${tone.badge}`}>
              QUICK CHECK • 5 QUESTIONS • {headerProfile.toUpperCase()}
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-none">
              Your score is <span className={`${tone.big}`}>{finalScore}%</span>
            </h1>

            <p className="mt-2 text-slate-400 text-sm">
              You need <span className="font-black text-white">{PASSING_SCORE}%</span> to pass in{" "}
              <span className="font-black text-white">{stateName}</span>.
            </p>

            {finalScore < PASSING_SCORE ? (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 inline-block">
                <div className="text-red-200 font-black uppercase tracking-widest text-[11px]">
                  If you take the test today, you will FAIL.
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 inline-block">
                <div className="text-emerald-200 font-black uppercase tracking-widest text-[11px]">
                  You’re close. Keep practicing to stay above 80%.
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-4">
              <IdCard />

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
                <div className="text-xs font-black text-slate-200 uppercase tracking-widest mb-2">What this means</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-black text-white">Weak topic</span> = the topic you miss the most.{" "}
                  <span className="font-black text-white">That’s what makes you fail.</span>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Your weak topic</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Need</div>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div className="text-white font-black">{weakDomain}</div>
                    <div className={`text-xl font-black ${willFail ? "text-red-300" : "text-emerald-300"}`}>
                      {willFail ? `${missing}%` : "0%"}
                    </div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className={`h-full ${tone.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${clamp(Math.round((finalScore / PASSING_SCORE) * 100), 0, 100)}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
                <div className="text-xs font-black text-slate-200 uppercase tracking-widest mb-3">What to do next</div>

                <div className="space-y-2">
                  {[
                    { k: "1", t: "Get full CDL practice tests", d: "Unlimited tests so you can practice anytime." },
                    { k: "2", t: "Use Fast Track (save time)", d: "Study only what you miss. No guessing." },
                    { k: "3", t: `Practice until ${PASSING_SCORE}%+`, d: "Take the full simulator until you stay above 80%." },
                  ].map((s) => (
                    <div key={s.k} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center shrink-0">
                          <span className="text-amber-300 font-black">{s.k}</span>
                        </div>
                        <div>
                          <div className="font-black text-white">{s.t}</div>
                          <div className="text-sm text-slate-400 mt-0.5 leading-relaxed">{s.d}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => goPay()}
                  className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-widest transition-transform active:scale-95 shadow-[0_0_40px_-16px_rgba(245,158,11,0.65)]"
                >
                  {primaryCta}
                </button>
                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  {ctaSub}
                </div>
              </div>

              {/* What you unlock (kept EXACT concept you asked for) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
                <div className="text-xs font-black text-slate-200 uppercase tracking-widest mb-3">Unlock includes</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unlockBullets.map((b) => (
                    <div key={b} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-200">
                      <span className="text-emerald-400 font-black">✓</span> <span className="font-semibold">{b}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 leading-relaxed">
                  <span className="font-black">Pass Guarantee: 12,000+</span> drivers passed last year using the app{" "}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black text-slate-200 uppercase tracking-widest">Your results</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Correct {totalCorrect}/5</div>
                </div>

                <div className="space-y-2">
                  {breakdownEntries.slice(0, 5).map(([cat, v]) => (
                    <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-white">{cat}</div>
                        <div className="text-xs font-mono text-slate-300">
                          {v.correct}/{v.total} • <span className="font-black text-white">{v.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${v.accuracy >= 80 ? "bg-emerald-500" : v.accuracy >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${clamp(v.accuracy, 0, 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-black text-white">Weak topic</span> is where you miss the most. That’s what we train.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black text-slate-200 uppercase tracking-widest">What you missed</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tap to unlock</div>
                </div>

                <div className="space-y-3">
                  {missedList.length ? (
                    missedList.map((m) => <MissedPreview key={m.id} item={m} />)
                  ) : (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-300">
                      Nice — you didn’t miss any in this quick check. Keep practicing to stay at 80%+.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => goPay()}
                  className="mt-4 w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest transition-transform active:scale-95 hover:bg-slate-200"
                >
                  See full answers + explanations →
                </button>

                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  Unlimited CDL practice tests • {ctaSub}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky CTA (direct to /pay, no modal) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-950/85 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-6xl mx-auto px-0 md:px-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-center md:text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {willFail ? "You are not ready yet" : "Keep practicing"}
                </div>
                <div className="text-xs text-slate-400">
                  {willFail ? `Need ${missing}% more to reach ${PASSING_SCORE}%` : `Stay above ${PASSING_SCORE}% to pass`}
                </div>
              </div>

              <button
                onClick={() => goPay()}
                className="w-full md:w-auto md:min-w-[420px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95"
              >
                {primaryCta}
              </button>
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              {ctaSub}
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
          <div className="text-2xl font-black">Loading…</div>
          <div className="mt-2 text-sm text-slate-400">Preparing your 5-question quick check.</div>

          {configLoaded ? (
            <div className="mt-6 text-[11px] font-mono text-slate-500">{headerProfile.toUpperCase()}</div>
          ) : (
            <div className="mt-6 text-[11px] font-mono text-slate-500">Loading your setup…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-10 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.55),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.9)_75%)]" />
      </div>

      <div className="relative z-20 px-5 py-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              CDL QUICK CHECK • 5 QUESTIONS
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">{headerProfile.toUpperCase()}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Q{currentQIndex + 1}/5 • {question.category}
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black font-mono ${
                urgency === "high" ? "text-red-400" : urgency === "med" ? "text-amber-300" : "text-slate-200"
              }`}
            >
              {timeLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">time left</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full h-1 bg-slate-900">
        <motion.div
          className="h-full bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQIndex + 1) / 5) * 100}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 flex-1 p-5 max-w-3xl mx-auto flex flex-col justify-center w-full">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-[10px] font-black text-slate-200 uppercase tracking-widest">
              {question.category}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Pick A–D</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black leading-relaxed tracking-tight">{question.text}</h2>
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
                    className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center text-[12px] font-black ${
                      active ? "border-amber-500 bg-amber-500 text-black" : "border-slate-700 text-slate-300"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm md:text-base font-semibold leading-relaxed">{opt}</div>
                    {active && (
                      <div className="mt-2 text-[10px] font-mono text-amber-300 uppercase tracking-widest">selected</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
          This is a quick check. Your full practice tests unlock after.
        </div>
      </div>

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
          {currentQIndex === 4 ? "Finish & See Score →" : "Next →"}
        </button>

        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          You need {PASSING_SCORE}% to pass in {stateName}
        </div>
      </div>
    </div>
  );
}
