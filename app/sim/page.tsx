"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type Question, type LicenseClass, type Endorsement } from "@/lib/questions";
import { useRouter } from "next/navigation";

// --- Types ---
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

// --- Helpers ---
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.random();
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DiagnosticPage() {
  const router = useRouter();

  // --- State ---
  const [stage, setStage] = useState<Stage>("quiz");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  
  // Animation State
  const [analysisText, setAnalysisText] = useState("INITIALIZING SYSTEM...");
  const [analysisPct, setAnalysisPct] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes pressure

  const question = activeQuestions[currentQIndex];

  // --- INIT: Load Config & Filter Questions ---
  useEffect(() => {
    // 1. Get User Config from LocalStorage
    const userLicense = (localStorage.getItem("userLevel") as LicenseClass) || "A";
    const userEndorsementsRaw = localStorage.getItem("userEndorsements");
    const userEndorsements: Endorsement[] = userEndorsementsRaw ? JSON.parse(userEndorsementsRaw) : [];

    // 2. Filter the Question Bank
    const eligible = questions.filter((q) => {
      // Must match license class
      if (!q.licenseClasses.includes(userLicense)) return false;
      
      // If question requires endorsement, user MUST have it
      if (q.endorsements && q.endorsements.length > 0) {
        const hasRequired = q.endorsements.some(req => userEndorsements.includes(req));
        if (!hasRequired) return false;
      }
      return true;
    });

    // 3. Pick 5 Random Questions for the Diagnostic
    const picked = shuffle(eligible).slice(0, 5);
    setActiveQuestions(picked.length > 0 ? picked : questions.slice(0, 5)); // Fallback
  }, []);

  // --- Timer ---
  useEffect(() => {
    if (stage !== "quiz") return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // --- Logic ---
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

  const runStopProtocol = (finalAnswers: AnswerRecord[]) => {
    setStage("analyzing");
    
    // Calculate stats
    const correct = finalAnswers.filter(a => a.isCorrect).length;
    const score = Math.round((correct / 5) * 100);
    
    // Save to LocalStorage for the Paywall/Dashboard
    localStorage.setItem("diagnosticScore", score.toString());
    
    // Find weakest domain
    const wrong = finalAnswers.find(a => !a.isCorrect);
    const weakDomain = wrong ? wrong.category : "General Knowledge";
    localStorage.setItem("weakestDomain", weakDomain);

    // Run the "Industrial" Animation
    const sequence = [
      { t: 1000, pct: 20, text: "UPLOADING DRIVER LOGS..." },
      { t: 2000, pct: 45, text: "ANALYZING BRAKING PATTERNS..." },
      { t: 3000, pct: 70, text: "CALCULATING SAFETY RISK..." },
      { t: 4000, pct: 90, text: "CRITICAL FAILURE DETECTED..." },
      { t: 5000, pct: 100, text: "EXAM STOPPED." },
    ];

    sequence.forEach((step) => {
      setTimeout(() => {
        setAnalysisPct(step.pct);
        setAnalysisText(step.text);
      }, step.t);
    });

    setTimeout(() => {
      setStage("preview");
    }, 5500);
  };

  // --- Views ---

  // 1. ANALYZING VIEW
  if (stage === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-mono text-center">
        <div className="w-full max-w-md">
          <div className="text-amber-500 text-6xl mb-6 animate-pulse">⚠️</div>
          <h2 className="text-3xl font-black text-white mb-8 tracking-tighter">
            STOP PROTOCOL INITIATED
          </h2>
          
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl">
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
            <p className="text-amber-400 font-bold text-sm blink">
              {">"} {analysisText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. PREVIEW / PAYWALL VIEW
  if (stage === "preview") {
    const missed = answers.find(a => !a.isCorrect);
    const score = parseInt(localStorage.getItem("diagnosticScore") || "0");

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          
          {/* Status Header */}
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6 text-center">
            <div className="text-red-500 font-black text-xs uppercase tracking-[0.2em] mb-1">
              Status: Grounded
            </div>
            <div className="text-3xl font-black text-white">
              RISK LEVEL: HIGH
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Readiness Score: <span className="text-red-400">{score}%</span>
            </div>
          </div>

          {/* The Hook: Missed Question */}
          {missed && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Critical Failure: {missed.category}
              </div>
              <p className="text-white font-bold text-sm mb-4">
                {missed.text}
              </p>
              
              {/* Blurred Rationale */}
              <div className="relative mt-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <div className="filter blur-sm select-none opacity-50 text-sm text-slate-300">
                  The correct answer is B because air brake lag distance at 55mph adds approximately 32 feet to your total stopping distance. You selected...
                </div>
                
                {/* Lock Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2">
                    <span>🔒</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Rationale Locked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push("/pay")}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-wider rounded-xl shadow-lg transition-all animate-pulse"
          >
            Unlock Fix Plan & Pass
          </button>
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => location.reload()}
              className="text-xs text-slate-500 underline hover:text-slate-400"
            >
              Restart Diagnostic
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 3. QUIZ VIEW
  if (!question) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* HUD Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center sticky top-0 z-20">
        <div>
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
            Diagnostic Active
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Q{currentQIndex + 1} / 5 • ID: {question.id}
          </div>
        </div>
        <div className="text-right font-mono font-bold text-xl text-slate-200">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-900">
        <motion.div 
          className="h-full bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQIndex + 1) / 5) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 p-6 max-w-2xl mx-auto flex flex-col justify-center">
        <div className="mb-6">
          <span className="inline-block px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase mb-3">
            {question.category}
          </span>
          <h2 className="text-xl md:text-2xl font-bold leading-relaxed">
            {question.text}
          </h2>
        </div>

        <div className="space-y-3">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedOption === idx
                  ? "bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold ${
                  selectedOption === idx ? "border-amber-500 bg-amber-500 text-black" : "border-slate-700"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-sm md:text-base font-medium">{opt}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800 bg-slate-950/50 backdrop-blur">
        <button
          onClick={commitAnswer}
          disabled={selectedOption === null}
          className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
            selectedOption === null
              ? "bg-slate-900 text-slate-600 cursor-not-allowed"
              : "bg-white text-black hover:bg-slate-200 shadow-lg"
          }`}
        >
          {currentQIndex === 4 ? "Complete Inspection" : "Confirm Selection"}
        </button>
      </div>
    </div>
  );
}
