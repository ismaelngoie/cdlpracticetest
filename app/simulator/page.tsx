"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- CONFIG ---
const EXAM_DURATION_SEC = 7200; // 2 Hours
const PASS_THRESHOLD = 80;

// --- TYPES ---
type ExamState = "boot" | "briefing" | "active" | "results";

type ExamSession = {
  license: LicenseClass;
  endorsements: Endorsement[];
  questionIds: number[];
  answers: Record<number, number>; // { qIdx: optIdx }
  flags: number[];
  currentIdx: number;
  endAt: number; // Timestamp when exam forces stop
  startedAt: number;
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

export default function SimulatorPage() {
  // --- STATE ---
  const [state, setState] = useState<ExamState>("boot");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [endAt, setEndAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SEC);
  
  // User Config
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);

  // --- INIT LOGIC ---
  useEffect(() => {
    // 1. Load User Config
    const l = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const e = JSON.parse(localStorage.getItem("userEndorsements") || "[]");
    setLicense(l);
    setEndorsements(e);

    // 2. Check for Active Session
    const savedSession = localStorage.getItem("haul-active-session");
    if (savedSession) {
      try {
        const session: ExamSession = JSON.parse(savedSession);
        // Resume if not expired
        if (session.endAt > Date.now()) {
          // Rehydrate Questions
          const restoredQs = session.questionIds
            .map(id => questions.find(q => q.id === id))
            .filter(Boolean) as Question[];
          
          if (restoredQs.length > 0) {
            setActiveQuestions(restoredQs);
            setAnswers(session.answers);
            setFlags(new Set(session.flags));
            setCurrentIdx(session.currentIdx);
            setEndAt(session.endAt);
            setTimeLeft(Math.floor((session.endAt - Date.now()) / 1000));
            setState("briefing"); // Go to briefing, let them click "RESUME"
            return;
          }
        }
      } catch (err) {
        console.error("Session Corrupt", err);
        localStorage.removeItem("haul-active-session");
      }
    }

    // 3. If no session, build fresh pool (but don't start yet)
    generateQuestionPool(l, e);
    setState("briefing");
  }, []);

  const generateQuestionPool = (l: LicenseClass, e: Endorsement[]) => {
    const pool = questions.filter((q) => {
      if (!q.licenseClasses.includes(l)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        const hasReq = q.endorsements.some((req) => e.includes(req));
        if (!hasReq) return false;
      }
      return true;
    });
    // In production, slice this to 70. For now, use all available.
    setActiveQuestions(shuffle(pool));
  };

  // --- PERSISTENCE ---
  useEffect(() => {
    if (state !== "active") return;
    
    const session: ExamSession = {
      license,
      endorsements,
      questionIds: activeQuestions.map(q => q.id),
      answers,
      flags: Array.from(flags),
      currentIdx,
      endAt,
      startedAt: endAt - (EXAM_DURATION_SEC * 1000)
    };
    
    localStorage.setItem("haul-active-session", JSON.stringify(session));
  }, [state, answers, flags, currentIdx, endAt, activeQuestions, license, endorsements]);

  // --- TIMER ---
  useEffect(() => {
    if (state !== "active") return;
    const interval = setInterval(() => {
      const remaining = Math.floor((endAt - Date.now()) / 1000);
      if (remaining <= 0) {
        finishExam();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state, endAt]);

  // --- ACTIONS ---
  const startExam = (resume = false) => {
    if (!resume) {
      setEndAt(Date.now() + (EXAM_DURATION_SEC * 1000));
      setTimeLeft(EXAM_DURATION_SEC);
      setAnswers({});
      setFlags(new Set());
      setCurrentIdx(0);
    }
    setState("active");
  };

  const handleSelect = (optIdx: number) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
  };

  const toggleFlag = () => {
    setFlags(prev => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      return next;
    });
  };

  const finishExam = () => {
    localStorage.removeItem("haul-active-session");
    setState("results");
  };

  // --- RENDERING ---
  const currentQ = activeQuestions[currentIdx];

  // 1. BOOT SCREEN
  if (state === "boot") return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-mono animate-pulse">SYSTEM BOOT...</div>;

  // 2. BRIEFING (Pre-Trip)
  if (state === "briefing") {
    const isResume = endAt > Date.now();
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        {/* Grid BG */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl relative z-10 shadow-2xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Exam Manifest</h1>
              <p className="text-xs text-slate-500 font-mono">FMCSA COMPLIANCE PROTOCOL</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-amber-500">{activeQuestions.length}</div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500">Items Loaded</div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-sm font-bold text-slate-400">LICENSE CLASS</span>
              <span className="text-sm font-mono font-bold text-white">CLASS {license}</span>
            </div>
            <div className="flex flex-col gap-2 p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Modules</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">GENERAL KNOWLEDGE</span>
                {endorsements.map(e => (
                  <span key={e} className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase">{e}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-900/10 rounded border border-blue-500/20">
              <span className="text-xl">⏱</span>
              <div>
                <div className="text-sm font-bold text-blue-200">Time Limit: 120 Minutes</div>
                <div className="text-xs text-blue-400/60">Session persists if window closed.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {isResume ? (
              <button onClick={() => startExam(true)} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                Resume Session ({formatTime(timeLeft)})
              </button>
            ) : (
              <button onClick={() => startExam(false)} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                Initialize New Exam
              </button>
            )}
            
            {isResume && (
              <button onClick={() => startExam(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest rounded-xl text-xs">
                Discard & Restart
              </button>
            )}
            
            <Link href="/dashboard" className="block text-center py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Return to Command
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. ACTIVE EXAM (HUD)
  if (state === "active") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-amber-500/30">
        
        {/* HUD Header */}
        <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Clock</span>
              <span className={`text-xl font-mono font-bold ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-white"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            
            <div className="h-8 w-px bg-slate-800 hidden md:block" />
            
            <div className="hidden md:block">
              <div className="flex gap-1 mb-1">
                {activeQuestions.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-3 rounded-full ${
                      i === currentIdx ? "bg-white h-4" : 
                      flags.has(i) ? "bg-amber-500" :
                      answers[i] !== undefined ? "bg-emerald-500/50" : "bg-slate-800"
                    }`} 
                  />
                ))}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                Progress: {Math.round(((currentIdx + 1) / activeQuestions.length) * 100)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFlag}
              className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                flags.has(currentIdx) 
                  ? "bg-amber-500/10 border-amber-500 text-amber-500" 
                  : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <span>⚑</span> {flags.has(currentIdx) ? "Flagged" : "Flag"}
            </button>
            <button 
              onClick={() => { if(confirm("Terminate exam session?")) finishExam() }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Submit
            </button>
          </div>
        </header>

        {/* Question Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {currentQ.category}
                </span>
                <span className="text-slate-600 text-xs font-mono">ID: {currentQ.id}</span>
              </div>

              <h2 className="text-xl md:text-3xl font-medium text-slate-100 leading-snug mb-8">
                {currentQ.text}
              </h2>

              <div className="grid gap-3">
                {currentQ.options.map((opt, i) => {
                  const isSelected = answers[currentIdx] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      className={`relative w-full text-left p-5 rounded-xl border-2 transition-all group ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-6 h-6 shrink-0 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                          isSelected ? "bg-amber-500 border-amber-500 text-slate-950" : "border-slate-700 text-slate-500 group-hover:border-slate-500"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className={`text-base ${isSelected ? "text-white font-medium" : "text-slate-400 group-hover:text-slate-200"}`}>
                          {opt}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center sticky bottom-0 z-20">
          <button
            onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest ${
              currentIdx === 0 ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            ← Previous
          </button>

          {currentIdx < activeQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(p => p + 1)}
              className="px-8 py-3 bg-white text-slate-950 hover:bg-slate-200 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg transition-colors"
            >
              Next Item →
            </button>
          ) : (
            <button
              onClick={finishExam}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all animate-pulse"
            >
              Finalize Log
            </button>
          )}
        </footer>
      </div>
    );
  }

  // 4. RESULTS (Report)
  if (state === "results") {
    let correct = 0;
    activeQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / activeQuestions.length) * 100);
    const passed = score >= PASS_THRESHOLD;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {/* Top Status Bar */}
          <div className={`absolute top-0 left-0 right-0 h-2 ${passed ? "bg-emerald-500" : "bg-red-500"}`} />
          
          <div className="text-center mb-10">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2">After Action Report</div>
            <h1 className="text-5xl font-black mb-1">{passed ? "ROAD READY" : "GROUNDED"}</h1>
            <p className={`text-sm font-bold uppercase tracking-widest ${passed ? "text-emerald-500" : "text-red-500"}`}>
              {passed ? "Certification Standards Met" : "Critical Safety Violations Detected"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Score</div>
              <div className={`text-4xl font-mono font-black ${passed ? "text-emerald-400" : "text-red-400"}`}>
                {score}%
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Correct</div>
              <div className="text-4xl font-mono font-black text-white">
                {correct}<span className="text-xl text-slate-600">/{activeQuestions.length}</span>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Time Elapsed</div>
              <div className="text-4xl font-mono font-black text-white">
                {Math.ceil((EXAM_DURATION_SEC - timeLeft) / 60)}<span className="text-xl text-slate-600">m</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="flex-1 py-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-xs transition-all">
              Re-Run Simulation
            </button>
            <Link href="/dashboard" className="flex-1 py-4 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest text-xs text-center flex items-center justify-center transition-all">
              Return to Base
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
