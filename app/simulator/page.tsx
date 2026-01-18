"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- EXAM CONFIGURATION ---
const EXAM_LENGTH = 70; // Standard Full Simulation
const EXAM_DURATION_SEC = 7200; // 2 Hours (120 Minutes)
const PASS_THRESHOLD = 80; // 80% Required to Pass

// --- TYPES ---
type ExamState = "boot" | "manifest" | "active" | "submitting" | "results";

type ExamSession = {
  license: LicenseClass;
  endorsements: Endorsement[];
  state: string;
  questionIds: number[];
  answers: Record<number, number>; // { qIdx: optIdx }
  flags: number[];
  currentIdx: number;
  endAt: number;
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
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SEC);
  const [endAt, setEndAt] = useState<number>(0);
  
  // User Configuration (The "Rig")
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [jurisdiction, setJurisdiction] = useState("TX");

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load Driver Profile
    const l = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const e = JSON.parse(localStorage.getItem("userEndorsements") || "[]");
    const s = localStorage.getItem("userState") || "TX";
    
    setLicense(l);
    setEndorsements(e);
    setJurisdiction(s);

    // 2. Check for Interrupted Session (Silent Resume)
    const savedSession = localStorage.getItem("haul-active-session");
    if (savedSession) {
      try {
        const session: ExamSession = JSON.parse(savedSession);
        // Only resume if valid and not expired
        if (session.endAt > Date.now()) {
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
            
            // Fast boot to manifest if resuming
            setTimeout(() => setState("manifest"), 800); 
            return;
          }
        }
      } catch (err) {
        localStorage.removeItem("haul-active-session");
      }
    }

    // 3. Build New Exam Pool (If no resume)
    const pool = questions.filter((q) => {
      // Must match license
      if (!q.licenseClasses.includes(l)) return false;
      // Must match endorsements (if question requires one)
      if (q.endorsements && q.endorsements.length > 0) {
        const hasReq = q.endorsements.some((req) => e.includes(req));
        if (!hasReq) return false;
      }
      return true;
    });

    // Shuffle and cut to exam length
    const finalSet = shuffle(pool).slice(0, EXAM_LENGTH);
    setActiveQuestions(finalSet);

    // Boot Sequence Effect
    setTimeout(() => setState("manifest"), 1500);
  }, []);

  // --- PERSISTENCE ENGINE ---
  useEffect(() => {
    if (state !== "active") return;
    
    const session: ExamSession = {
      license,
      endorsements,
      state: jurisdiction,
      questionIds: activeQuestions.map(q => q.id),
      answers,
      flags: Array.from(flags),
      currentIdx,
      endAt,
      startedAt: endAt - (EXAM_DURATION_SEC * 1000)
    };
    
    localStorage.setItem("haul-active-session", JSON.stringify(session));
  }, [state, answers, flags, currentIdx, endAt, activeQuestions, license, endorsements, jurisdiction]);

  // --- CLOCK ---
  useEffect(() => {
    if (state !== "active") return;
    
    const timer = setInterval(() => {
      const remaining = Math.floor((endAt - Date.now()) / 1000);
      if (remaining <= 0) {
        finishExam();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state, endAt]);

  // --- ACTIONS ---
  const startExam = () => {
    // Only set new end time if not resuming
    if (endAt < Date.now()) {
        const newEnd = Date.now() + (EXAM_DURATION_SEC * 1000);
        setEndAt(newEnd);
        setTimeLeft(EXAM_DURATION_SEC);
    }
    setState("active");
  };

  const handleSelect = (idx: number) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: idx }));
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
    setState("submitting");
    setTimeout(() => {
      localStorage.removeItem("haul-active-session");
      setState("results");
    }, 1500); // Fake processing delay for realism
  };

  // --- RENDERERS ---
  const currentQ = activeQuestions[currentIdx];

  // 1. BOOT SEQUENCE
  if (state === "boot") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-amber-500 animate-pulse" />
          <div className="text-amber-500 text-xs tracking-[0.2em]">SYSTEM INITIALIZATION</div>
        </div>
        <div className="text-slate-500 text-[10px]">
          CONNECTING TO FMCSA DATABASE...
        </div>
      </div>
    );
  }

  // 2. EXAM MANIFEST (The "Start" Screen)
  if (state === "manifest") {
    const isResuming = endAt > Date.now();
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Top Bar Decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />

          <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Official Testing Protocol</div>
              <h1 className="text-3xl font-black text-white">EXAM MANIFEST</h1>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-amber-500">{jurisdiction} DMV</div>
              <div className="text-[10px] text-slate-600 font-mono">ID: {Math.floor(Math.random() * 99999)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-950 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">License Class</div>
              <div className="text-xl font-mono font-bold text-white">CLASS {license}</div>
            </div>
            <div className="p-4 bg-slate-950 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time Allotted</div>
              <div className="text-xl font-mono font-bold text-white">120 MIN</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Active Modules</div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-white/5 border border-white/10 text-xs font-mono text-slate-300 rounded">GENERAL KNOWLEDGE</span>
              {endorsements.map(e => (
                <span key={e} className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-500 rounded uppercase">{e}</span>
              ))}
            </div>
          </div>

          <button 
            onClick={startExam}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            {isResuming ? `RESUME SESSION (${formatTime(timeLeft)})` : "BEGIN EXAMINATION"}
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

  // 3. SUBMITTING LOADING SCREEN
  if (state === "submitting") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin mb-6" />
        <div className="text-amber-500 font-mono text-xs tracking-widest uppercase animate-pulse">Processing Results...</div>
      </div>
    );
  }

  // 4. RESULTS
  if (state === "results") {
    const correctCount = Object.keys(answers).filter(idx => 
      answers[parseInt(idx)] === activeQuestions[parseInt(idx)].correctIndex
    ).length;
    const score = Math.round((correctCount / activeQuestions.length) * 100);
    const passed = score >= PASS_THRESHOLD;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl text-center">
          
          <div className="mb-8">
            <div className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Official Score Report
            </div>
            <h1 className="text-5xl font-black text-white mb-2">{passed ? "QUALIFIED" : "DISQUALIFIED"}</h1>
            <p className={`text-sm font-bold uppercase tracking-widest ${passed ? "text-emerald-500" : "text-red-500"}`}>
              {passed ? "Ready for DMV Certification" : "Requires Additional Training"}
            </p>
          </div>

          <div className="flex justify-center mb-10">
            <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center bg-slate-950 ${passed ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}>
              <div>
                <div className="text-5xl font-mono font-bold tracking-tighter">{score}%</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Final Score</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Correct Answers</div>
              <div className="text-xl font-mono font-bold text-white">{correctCount} <span className="text-slate-600 text-sm">/ {activeQuestions.length}</span></div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time Elapsed</div>
              <div className="text-xl font-mono font-bold text-white">{Math.ceil((EXAM_DURATION_SEC - timeLeft) / 60)} <span className="text-slate-600 text-sm">MIN</span></div>
            </div>
          </div>

          <Link href="/dashboard" className="block w-full py-4 bg-white text-slate-950 font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
            Return to Base
          </Link>
        </div>
      </div>
    );
  }

  // 5. ACTIVE SIMULATOR (The Kiosk)
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      
      {/* Kiosk Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Time Remaining</div>
            <div className={`text-xl font-mono font-bold ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-white"}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-800 hidden md:block" />
          
          <div className="hidden md:block">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Examination Progress</div>
            <div className="text-sm font-mono font-bold text-slate-300">
              QUESTION {currentIdx + 1} <span className="text-slate-600">/ {activeQuestions.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFlag}
            className={`px-4 py-2 rounded border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              flags.has(currentIdx) 
                ? "bg-amber-500/10 border-amber-500 text-amber-500" 
                : "border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <span>⚑</span> {flags.has(currentIdx) ? "Flagged" : "Flag"}
          </button>
          
          <button 
            onClick={() => { if(confirm("Are you sure you want to submit your exam? This cannot be undone.")) finishExam() }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Question Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Question Meta */}
            <div className="mb-6 flex items-center gap-3">
              <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-700">
                {currentQ.category}
              </span>
              {currentQ.endorsements && currentQ.endorsements.length > 0 && (
                <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded border border-blue-500/20">
                  {currentQ.endorsements[0]} Module
                </span>
              )}
            </div>

            {/* The Question */}
            <h2 className="text-xl md:text-3xl font-medium text-slate-100 leading-snug mb-10">
              {currentQ.text}
            </h2>

            {/* Options Grid */}
            <div className="grid gap-3">
              {currentQ.options.map((opt, i) => {
                const isSelected = answers[currentIdx] === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`relative w-full text-left p-5 rounded-lg border-2 transition-all group ${
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
                      <span className={`text-base ${isSelected ? "text-white font-bold" : "text-slate-400 group-hover:text-slate-200"}`}>
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

      {/* Navigation Bar */}
      <footer className="p-4 md:p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center sticky bottom-0 z-20">
        <button
          onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors ${
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
            Next Question →
          </button>
        ) : (
          <button
            onClick={() => { if(confirm("Are you sure you want to submit?")) finishExam() }}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all animate-pulse"
          >
            Finish & Submit
          </button>
        )}
      </footer>
    </div>
  );
}
