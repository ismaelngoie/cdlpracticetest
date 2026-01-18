"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";
import Link from "next/link";

// --- CONFIG ---
const EXAM_LENGTH = 70; // Standard CDL Exam Length
const TIME_LIMIT = 7200; // 2 Hours in seconds

export default function SimulatorPage() {
  // --- STATE ---
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // { questionIdx: optionIdx }
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // --- INIT ---
  useEffect(() => {
    // 1. Load User Config
    const license = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const endorsementsRaw = localStorage.getItem("userEndorsements");
    const endorsements: Endorsement[] = endorsementsRaw ? JSON.parse(endorsementsRaw) : [];

    // 2. Filter Questions based on Rig Configuration
    const pool = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        // Only show endorsement questions if the user HAS that endorsement
        const hasReq = q.endorsements.some((req) => endorsements.includes(req));
        if (!hasReq) return false;
      }
      return true;
    });

    // 3. Shuffle & Slice
    // (In a real app, we'd ensure we have enough questions, for now we repeat if pool is small)
    let examSet = [...pool].sort(() => Math.random() - 0.5);
    
    // Safety check: if pool is small (since we only added 10 sample questions), just use what we have
    if (examSet.length < EXAM_LENGTH) {
        // In production with 500+ questions, this line handles the cut
        // For now, we just use all available questions so the UI doesn't break
    } else {
        examSet = examSet.slice(0, EXAM_LENGTH);
    }

    setActiveQuestions(examSet);
  }, []);

  // --- TIMER ---
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  // --- ACTIONS ---
  const handleSelect = (optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const toggleFlag = () => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      return next;
    });
  };

  const finishExam = () => {
    // Calculate Score
    let correctCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correctCount++;
    });
    const finalScore = Math.round((correctCount / activeQuestions.length) * 100);
    
    setScore(finalScore);
    setIsFinished(true);

    // Save for Dashboard Stats
    localStorage.setItem("lastExamScore", finalScore.toString());
    localStorage.setItem("diagnosticScore", finalScore.toString()); // Update main gauge
  };

  // --- RENDERING ---
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQ = activeQuestions[currentIdx];

  // 1. LOADING STATE
  if (!currentQ && !isFinished) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-mono">LOADING SIMULATION...</div>;

  // 2. RESULTS STATE
  if (isFinished) {
    const passed = score >= 80;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl">
          <div className={`absolute top-0 left-0 w-full h-2 ${passed ? "bg-emerald-500" : "bg-red-500"}`} />
          
          <div className="mb-6">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Simulation Report</div>
            <h1 className="text-4xl font-black text-white">{passed ? "ROAD READY" : "FAILURE"}</h1>
          </div>

          <div className="flex justify-center mb-8">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${passed ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}>
              <span className="text-4xl font-mono font-bold">{score}%</span>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            {passed 
              ? "You have met the federal standards for this endorsement configuration. You are ready for the DMV."
              : "Safety violation risk detected. Review your missed answers and restart the simulator."
            }
          </p>

          <Link href="/dashboard" className="block w-full py-4 bg-white text-slate-950 font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
            Return to Command
          </Link>
        </div>
      </div>
    );
  }

  // 3. EXAM STATE
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      
      {/* HUD HEADER */}
      <header className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">
            ✕ ABORT
          </Link>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
              Sim Active
            </div>
            <div className="text-xs text-slate-400 font-mono">
              ITEM {currentIdx + 1} / {activeQuestions.length}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xl font-mono font-bold ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-white"}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* MAIN INTERFACE */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Category Tag */}
            <div className="mb-6 flex justify-between items-center">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {currentQ.category}
              </span>
              
              <button 
                onClick={toggleFlag}
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${flags.has(currentIdx) ? "text-amber-500" : "text-slate-600 hover:text-slate-400"}`}
              >
                <span>⚑</span> {flags.has(currentIdx) ? "Flagged" : "Flag for Review"}
              </button>
            </div>

            {/* Question Text */}
            <h2 className="text-xl md:text-3xl font-medium leading-relaxed mb-8 text-slate-100">
              {currentQ.text}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentIdx] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all group ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                        isSelected 
                          ? "bg-amber-500 border-amber-500 text-slate-950" 
                          : "border-slate-600 text-slate-500 group-hover:border-slate-400"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`text-base md:text-lg ${isSelected ? "text-white font-medium" : "text-slate-400"}`}>
                        {opt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* NAV FOOTER */}
      <footer className="p-6 border-t border-slate-800 bg-slate-950/80 backdrop-blur flex justify-between items-center sticky bottom-0 z-20">
        <button
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className={`px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest ${
            currentIdx === 0 ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          ← Prev
        </button>

        {currentIdx < activeQuestions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx(prev => prev + 1)}
            disabled={answers[currentIdx] === undefined}
            className={`px-8 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
              answers[currentIdx] === undefined
                ? "bg-slate-900 text-slate-600 cursor-not-allowed"
                : "bg-white text-black hover:bg-slate-200 shadow-lg"
            }`}
          >
            Next Item →
          </button>
        ) : (
          <button
            onClick={finishExam}
            className="px-8 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
          >
            Transmit Log (Finish)
          </button>
        )}
      </footer>
    </div>
  );
}
