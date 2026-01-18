// app/simulator/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- EXAM CONFIGURATION ---
const EXAM_LENGTH = 70;
const EXAM_DURATION_SEC = 7200; // 2 hours
const PASS_THRESHOLD = 80;

// --- TYPES ---
type ExamState = "boot" | "manifest" | "active" | "submitting" | "results";

type ExamSession = {
  license: LicenseClass;
  endorsements: Endorsement[];
  state: string;
  questionIds: number[];
  answers: Record<number, number>; // key = question index
  flags: number[];
  currentIdx: number;
  endAt: number;
  startedAt: number;
  examId: string;
};

// --- HELPERS ---
function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeExamId() {
  // short, “official” looking id
  const partA = Math.floor(100 + Math.random() * 900);
  const partB = Math.floor(1000 + Math.random() * 9000);
  const partC = Math.floor(10 + Math.random() * 90);
  return `DMV-${partA}-${partB}-${partC}`;
}

// --- UI PRIMITIVES ---
function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "amber" | "emerald" | "red" | "slate" | "blue";
}) {
  const cls =
    tone === "amber"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : tone === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : tone === "red"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : tone === "blue"
      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
      : "bg-white/5 border-white/10 text-slate-300";
  return (
    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest ${cls}`}>
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

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close modal"
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed z-[90] left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Prompt</div>
                    <h3 className="text-xl font-black text-white mt-1">{title}</h3>
                    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center text-slate-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
            <div className="mx-auto max-w-3xl bg-slate-950 border border-slate-800 rounded-t-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Exam Review</div>
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

// --- MAIN ---
export default function SimulatorPage() {
  // --- STATE ---
  const [state, setState] = useState<ExamState>("boot");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SEC);
  const [endAt, setEndAt] = useState<number>(0);

  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [jurisdiction, setJurisdiction] = useState("TX");

  const [examId, setExamId] = useState<string>("DMV-000-0000-00");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitPromptOpen, setSubmitPromptOpen] = useState(false);

  const currentQ = activeQuestions[currentIdx];

  const isResuming = useMemo(() => endAt > Date.now(), [endAt]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const flaggedCount = useMemo(() => flags.size, [flags]);
  const unansweredCount = useMemo(() => Math.max(0, activeQuestions.length - answeredCount), [activeQuestions.length, answeredCount]);
  const progressPct = useMemo(() => {
    if (!activeQuestions.length) return 0;
    return Math.round(((currentIdx + 1) / activeQuestions.length) * 100);
  }, [currentIdx, activeQuestions.length]);

  const timeTone = useMemo(() => {
    if (timeLeft <= 120) return "red";
    if (timeLeft <= 300) return "amber";
    return "slate";
  }, [timeLeft]);

  // --- ACTIONS (callbacks) ---
  const handleSelect = useCallback((optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
  }, [currentIdx]);

  const toggleFlag = useCallback(() => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      return next;
    });
  }, [currentIdx]);

  const finishExam = useCallback(() => {
    setSubmitPromptOpen(false);
    setReviewOpen(false);
    setState("submitting");
    setTimeout(() => {
      localStorage.removeItem("haul-active-session");
      localStorage.removeItem("haul-exam-id");
      setState("results");
    }, 1400);
  }, []);

  const startExam = useCallback(() => {
    // Only set new end time if not resuming
    if (endAt < Date.now()) {
      const newEnd = Date.now() + EXAM_DURATION_SEC * 1000;
      setEndAt(newEnd);
      setTimeLeft(EXAM_DURATION_SEC);
      localStorage.setItem("haul-exam-id", examId);
    }
    setState("active");
  }, [endAt, examId]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1) Driver profile
    const l = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const e = (() => {
      try {
        return JSON.parse(localStorage.getItem("userEndorsements") || "[]");
      } catch {
        return [];
      }
    })();
    const s = localStorage.getItem("userState") || "TX";

    setLicense(l);
    setEndorsements(Array.isArray(e) ? e : []);
    setJurisdiction(s);

    // 1b) Exam ID (persist across resume)
    const savedExamId = localStorage.getItem("haul-exam-id");
    const id = savedExamId || makeExamId();
    setExamId(id);
    if (!savedExamId) localStorage.setItem("haul-exam-id", id);

    // 2) Silent resume
    const savedSession = localStorage.getItem("haul-active-session");
    if (savedSession) {
      try {
        const session: ExamSession = JSON.parse(savedSession);
        if (session.endAt > Date.now()) {
          const restoredQs = session.questionIds
            .map((qid) => questions.find((q) => q.id === qid))
            .filter(Boolean) as Question[];

          if (restoredQs.length > 0) {
            setActiveQuestions(restoredQs);
            setAnswers(session.answers || {});
            setFlags(new Set(session.flags || []));
            setCurrentIdx(session.currentIdx || 0);
            setEndAt(session.endAt);
            setTimeLeft(Math.floor((session.endAt - Date.now()) / 1000));
            setExamId(session.examId || id);
            setTimeout(() => setState("manifest"), 700);
            return;
          }
        }
      } catch {
        localStorage.removeItem("haul-active-session");
      }
    }

    // 3) Build new pool
    const pool = questions.filter((q) => {
      if (!q.licenseClasses.includes(l)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasReq = q.endorsements.some((req) => (Array.isArray(e) ? e : []).includes(req));
        if (!hasReq) return false;
      }
      return true;
    });

    const finalSet = shuffle(pool).slice(0, EXAM_LENGTH);
    setActiveQuestions(finalSet);

    // Boot -> manifest
    setTimeout(() => setState("manifest"), 1400);
  }, []);

  // --- PERSISTENCE ENGINE ---
  useEffect(() => {
    if (state !== "active") return;
    if (!activeQuestions.length) return;

    const session: ExamSession = {
      license,
      endorsements,
      state: jurisdiction,
      questionIds: activeQuestions.map((q) => q.id),
      answers,
      flags: Array.from(flags),
      currentIdx,
      endAt,
      startedAt: endAt - EXAM_DURATION_SEC * 1000,
      examId,
    };

    localStorage.setItem("haul-active-session", JSON.stringify(session));
  }, [state, answers, flags, currentIdx, endAt, activeQuestions, license, endorsements, jurisdiction, examId]);

  // --- CLOCK ---
  useEffect(() => {
    if (state !== "active") return;

    const timer = setInterval(() => {
      const remaining = Math.floor((endAt - Date.now()) / 1000);
      if (remaining <= 0) finishExam();
      else setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [state, endAt, finishExam]);

  // --- KEYBOARD SHORTCUTS (real exam vibe) ---
  useEffect(() => {
    if (state !== "active") return;

    const onKey = (e: KeyboardEvent) => {
      if (submitPromptOpen) return;

      const key = e.key.toLowerCase();

      if (key === "escape") {
        setReviewOpen(false);
        setSubmitPromptOpen(false);
      }

      if (key === "r") setReviewOpen((p) => !p);
      if (key === "f") toggleFlag();

      if (key === "arrowleft") setCurrentIdx((p) => Math.max(0, p - 1));
      if (key === "arrowright") setCurrentIdx((p) => Math.min(activeQuestions.length - 1, p + 1));

      const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
      if (map[key] !== undefined && currentQ?.options?.[map[key]] !== undefined) {
        handleSelect(map[key]);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, activeQuestions.length, currentQ, handleSelect, toggleFlag, submitPromptOpen]);

  // --- RESULTS COMPUTATION ---
  const results = useMemo(() => {
    if (!activeQuestions.length) return null;
    const correctCount = Object.keys(answers).filter((idx) => {
      const i = parseInt(idx, 10);
      return answers[i] === activeQuestions[i]?.correctIndex;
    }).length;
    const score = Math.round((correctCount / activeQuestions.length) * 100);
    const passed = score >= PASS_THRESHOLD;
    const elapsedMin = Math.ceil((EXAM_DURATION_SEC - timeLeft) / 60);
    return { correctCount, score, passed, elapsedMin };
  }, [answers, activeQuestions, timeLeft]);

  // --- REVIEW GRID (navigator) ---
  const QuestionNavigator = useCallback(
    ({ onPick }: { onPick: (i: number) => void }) => {
      const total = activeQuestions.length;
      const cells = Array.from({ length: total }, (_, i) => i);

      const cellClass = (i: number) => {
        const isCurrent = i === currentIdx;
        const isFlagged = flags.has(i);
        const isAnswered = answers[i] !== undefined;

        if (isCurrent) return "bg-amber-500 text-slate-950 border-amber-500";
        if (isFlagged && isAnswered) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
        if (isFlagged) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
        if (isAnswered) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
        return "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-600";
      };

      return (
        <div className="grid grid-cols-7 gap-2">
          {cells.map((i) => (
            <button
              key={i}
              onClick={() => onPick(i)}
              className={`h-10 rounded-xl border text-[11px] font-black font-mono transition-colors ${cellClass(i)}`}
              title={`Question ${i + 1}${flags.has(i) ? " • Flagged" : ""}${answers[i] !== undefined ? " • Answered" : " • Unanswered"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      );
    },
    [activeQuestions.length, answers, currentIdx, flags]
  );

  // --- RENDERERS ---
  // 1) BOOT
  if (state === "boot") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.25),transparent_60%)]" />
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="w-3 h-3 bg-amber-500 animate-pulse rounded-sm" />
            <div className="text-amber-500 text-xs tracking-[0.22em] font-black uppercase">Secure Exam Environment</div>
          </div>
          <div className="text-slate-500 text-[10px] tracking-[0.2em] uppercase">Connecting to state rule pack…</div>
          <div className="mt-6 w-56 h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mx-auto">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="mt-6 text-[10px] text-slate-600 uppercase tracking-widest">
            ID <span className="text-slate-300 font-bold">{examId}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2) MANIFEST
  if (state === "manifest") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.25),transparent_60%)]" />

        <div className="max-w-2xl w-full bg-slate-900/70 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />

          <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Official Testing Protocol</div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">EXAM MANIFEST</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone="blue">{jurisdiction} DMV</Pill>
                <Pill tone="slate">Secure Mode</Pill>
                <Pill tone={isResuming ? "amber" : "emerald"}>{isResuming ? "Resume Available" : "Fresh Session"}</Pill>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Candidate ID</div>
              <div className="text-sm font-mono font-bold text-slate-200">{examId}</div>
              <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-1">
                Window: <span className="text-slate-300 font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">License Class</div>
              <div className="text-2xl font-mono font-black text-white">CLASS {license}</div>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Questions</div>
              <div className="text-2xl font-mono font-black text-white">{EXAM_LENGTH}</div>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Time Allotted</div>
              <div className="text-2xl font-mono font-black text-white">120 MIN</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Active Modules</div>
            <div className="flex flex-wrap gap-2">
              <Pill>General Knowledge</Pill>
              {endorsements.map((e) => (
                <Pill key={e} tone="amber">
                  {e}
                </Pill>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Rules</div>
              <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span> No feedback during the exam. Review flagged items at the end.
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span> Timer continues once started. Session auto-submits at 0:00.
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span> Shortcuts: <span className="font-mono text-slate-200">A/B/C/D</span> select •{" "}
                  <span className="font-mono text-slate-200">F</span> flag • <span className="font-mono text-slate-200">R</span> review •{" "}
                  <span className="font-mono text-slate-200">←/→</span> navigate.
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={startExam}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_18px_40px_-18px_rgba(245,158,11,0.9)] transition-all active:scale-[0.98]"
          >
            {isResuming ? `RESUME SECURE SESSION (${formatTime(timeLeft)})` : "BEGIN EXAMINATION"}
          </button>

          <div className="mt-4 text-center">
            <Link href="/dashboard" className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors">
              Return to Command Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3) SUBMITTING
  if (state === "submitting") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.25),transparent_60%)]" />
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />

        <div className="max-w-md w-full mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-800 bg-slate-900/60 mb-6">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Submitting exam to scoring engine</div>
          </div>

          <div className="w-14 h-14 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin mx-auto mb-6" />
          <div className="text-amber-500 font-mono text-xs tracking-widest uppercase animate-pulse">Processing Results…</div>
          <div className="mt-3 text-[10px] text-slate-600 uppercase tracking-widest">
            Do not refresh • ID <span className="text-slate-300 font-bold">{examId}</span>
          </div>
        </div>
      </div>
    );
  }

  // 4) RESULTS
  if (state === "results" && results) {
    const { correctCount, score, passed, elapsedMin } = results;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className={`fixed inset-0 pointer-events-none opacity-10 ${passed ? "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.25),transparent_60%)]" : "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.25),transparent_60%)]"}`} />

        <div className="max-w-lg w-full bg-slate-900/70 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />

          <div className="mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">
              Official Score Report • {jurisdiction} DMV
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
              {passed ? "QUALIFIED" : "DISQUALIFIED"}
            </h1>
            <p className={`text-sm font-black uppercase tracking-widest ${passed ? "text-emerald-400" : "text-red-400"}`}>
              {passed ? "Ready for DMV Certification" : "Requires Additional Training"}
            </p>

            <div className="mt-3 text-[10px] text-slate-500 uppercase tracking-widest">
              Candidate ID <span className="text-slate-200 font-bold">{examId}</span>
            </div>
          </div>

          <div className="flex justify-center mb-10">
            <div className={`w-44 h-44 rounded-full border-4 flex items-center justify-center bg-slate-950 ${passed ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}>
              <div>
                <div className="text-6xl font-mono font-black tracking-tighter">{score}%</div>
                <div className="text-[10px] text-slate-500 font-black uppercase mt-1">Final Score</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Correct Answers</div>
              <div className="text-2xl font-mono font-black text-white">
                {correctCount} <span className="text-slate-600 text-sm">/ {activeQuestions.length}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Time Elapsed</div>
              <div className="text-2xl font-mono font-black text-white">
                {elapsedMin} <span className="text-slate-600 text-sm">MIN</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="block w-full py-4 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Return to Base
          </Link>
        </div>
      </div>
    );
  }

  // Guard (rare)
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono">
        LOADING EXAM MODULE…
      </div>
    );
  }

  // 5) ACTIVE SIMULATOR (SECURE KIOSK)
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
      {/* Watermark */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <div className="absolute -right-20 top-24 rotate-12 text-[120px] font-black tracking-tighter text-white/5">
          {jurisdiction}
        </div>
        <div className="absolute left-8 bottom-20 text-[10px] font-mono uppercase tracking-[0.25em] text-white/10">
          SECURE EXAM MODE • {examId}
        </div>
      </div>

      {/* Submit prompt */}
      <Modal
        open={submitPromptOpen}
        title="Submit Examination?"
        subtitle="This action finalizes your answers. You cannot return to the simulator after submission."
        onClose={() => setSubmitPromptOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Answered</div>
                <div className="text-xl font-mono font-black text-white">{answeredCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Flagged</div>
                <div className="text-xl font-mono font-black text-white">{flaggedCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unanswered</div>
                <div className={`text-xl font-mono font-black ${unansweredCount ? "text-amber-400" : "text-emerald-400"}`}>
                  {unansweredCount}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={(answeredCount / Math.max(1, activeQuestions.length)) * 100} />
            </div>
            <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest">
              Tip: press <span className="text-slate-200 font-bold">R</span> to review before submit.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSubmitPromptOpen(false)}
              className="flex-1 py-3 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 font-black uppercase tracking-widest text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={finishExam}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest text-[11px] shadow-[0_18px_40px_-18px_rgba(245,158,11,0.9)]"
            >
              Submit Now
            </button>
          </div>
        </div>
      </Modal>

      {/* Mobile Review Sheet */}
      <Sheet
        open={reviewOpen}
        title={`Questions (${currentIdx + 1}/${activeQuestions.length})`}
        onClose={() => setReviewOpen(false)}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <Pill tone="emerald">Answered {answeredCount}</Pill>
            <Pill tone="amber">Flagged {flaggedCount}</Pill>
            <Pill tone={unansweredCount ? "red" : "emerald"}>Unanswered {unansweredCount}</Pill>
          </div>
          <button
            onClick={() => setSubmitPromptOpen(true)}
            className="px-4 py-2 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest text-[10px]"
          >
            Submit
          </button>
        </div>

        <QuestionNavigator
          onPick={(i) => {
            setCurrentIdx(i);
            setReviewOpen(false);
          }}
        />
      </Sheet>

      {/* Kiosk Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          {/* Left: Exam identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-2xl border border-slate-800 bg-slate-900/60">
              <span className="text-amber-400 text-lg">🛡️</span>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Secure Exam • {jurisdiction} DMV
              </div>
              <div className="text-sm font-mono font-bold text-slate-200 truncate">
                {examId} <span className="text-slate-600">/</span> CLASS {license}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Pill tone="slate">No Feedback</Pill>
                <Pill tone={flags.has(currentIdx) ? "amber" : "slate"}>{flags.has(currentIdx) ? "Flagged" : "Review Ready"}</Pill>
              </div>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Time Remaining</div>
            <div
              className={`text-2xl md:text-3xl font-mono font-black tracking-tight ${
                timeTone === "red" ? "text-red-400 animate-pulse" : timeTone === "amber" ? "text-amber-400" : "text-white"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setReviewOpen(true)}
              className="hidden md:inline-flex px-4 py-2 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 font-black uppercase tracking-widest text-[10px]"
              title="Review (R)"
            >
              Review
            </button>
            <button
              onClick={toggleFlag}
              className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                flags.has(currentIdx)
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200"
              }`}
              title="Flag (F)"
            >
              ⚑ Flag
            </button>
            <button
              onClick={() => setSubmitPromptOpen(true)}
              className="px-4 py-2 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200"
              title="Submit"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Progress strip */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Question <span className="text-slate-200 font-bold">{currentIdx + 1}</span> / {activeQuestions.length}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Answered <span className="text-slate-200 font-bold">{answeredCount}</span> • Flagged{" "}
              <span className="text-slate-200 font-bold">{flaggedCount}</span>
            </div>
          </div>
          <ProgressBar value={progressPct} />
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Question Panel */}
        <AnimatePresence mode="wait">
          <motion.section
            key={currentIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="slate">{currentQ.category}</Pill>
                  {currentQ.endorsements && currentQ.endorsements.length > 0 && (
                    <Pill tone="blue">{currentQ.endorsements[0]} Module</Pill>
                  )}
                  {answers[currentIdx] !== undefined && <Pill tone="emerald">Answer Recorded</Pill>}
                  {flags.has(currentIdx) && <Pill tone="amber">Marked for Review</Pill>}
                </div>

                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Candidate <span className="text-slate-200 font-bold">{examId}</span>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Prompt</div>
              <h2 className="text-xl md:text-3xl font-semibold text-slate-100 leading-snug mb-8">
                {currentQ.text}
              </h2>

              {/* Options */}
              <div className="grid gap-3">
                {currentQ.options.map((opt, i) => {
                  const isSelected = answers[currentIdx] === i;

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all group ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-black border transition-colors ${
                            isSelected
                              ? "bg-amber-500 border-amber-500 text-slate-950"
                              : "border-slate-700 text-slate-400 group-hover:border-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>

                        <div className="flex-1">
                          <div className={`text-base md:text-lg ${isSelected ? "text-white font-bold" : "text-slate-300 group-hover:text-slate-100"}`}>
                            {opt}
                          </div>
                          <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                            Press <span className="text-slate-300 font-bold">{String.fromCharCode(65 + i)}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-amber-400 font-black"
                          >
                            ✓
                          </motion.div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Small helper row */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  Shortcuts: <span className="text-slate-300 font-bold">A/B/C/D</span> select •{" "}
                  <span className="text-slate-300 font-bold">F</span> flag •{" "}
                  <span className="text-slate-300 font-bold">R</span> review •{" "}
                  <span className="text-slate-300 font-bold">←/→</span> nav
                </div>

                <button
                  onClick={() => setReviewOpen(true)}
                  className="md:hidden px-4 py-2 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 font-black uppercase tracking-widest text-[10px]"
                >
                  Review
                </button>
              </div>
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Desktop Review Panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-[164px] space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Review Panel</div>
                    <div className="text-white font-black">Navigator</div>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    {answeredCount}/{activeQuestions.length}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Pill tone="emerald">Answered {answeredCount}</Pill>
                  <Pill tone="amber">Flagged {flaggedCount}</Pill>
                  <Pill tone={unansweredCount ? "red" : "emerald"}>Unanswered {unansweredCount}</Pill>
                </div>

                <QuestionNavigator onPick={(i) => setCurrentIdx(i)} />

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legend</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-500" /> Current
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/30" /> Answered
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/30" /> Flagged
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" /> Unanswered
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSubmitPromptOpen(true)}
                  className="w-full py-3 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest text-[11px] hover:bg-slate-200"
                >
                  Submit Exam
                </button>

                <div className="text-center">
                  <Link href="/dashboard" className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors">
                    Exit to Command Center
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Nav */}
      <footer className="sticky bottom-0 z-30 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className={`px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-colors border ${
              currentIdx === 0
                ? "text-slate-700 border-slate-900 bg-slate-950 cursor-not-allowed"
                : "text-slate-200 border-slate-800 bg-slate-900/40 hover:bg-slate-900"
            }`}
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFlag}
              className={`px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest border transition-colors ${
                flags.has(currentIdx)
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-slate-900/40 border-slate-800 text-slate-200 hover:bg-slate-900"
              }`}
            >
              ⚑ Flag
            </button>

            <button
              onClick={() => setReviewOpen(true)}
              className="px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-200 lg:hidden"
            >
              Review
            </button>
          </div>

          {currentIdx < activeQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((p) => Math.min(activeQuestions.length - 1, p + 1))}
              className="px-6 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black text-[11px] uppercase tracking-widest shadow-lg transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setSubmitPromptOpen(true)}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
            >
              Finish & Submit
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
