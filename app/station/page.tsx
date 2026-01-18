"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { questions, type Question } from "@/lib/questions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

function StationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category");
  const mode = searchParams.get("mode") || "drill"; // drill (timed) or study (untimed)

  const [pool, setPool] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    if (!category) return;
    const filtered = questions.filter(q => q.category === category);
    setPool(filtered);
  }, [category]);

  const currentQ = pool[idx];

  const handleSelect = (i: number) => {
    if (showRationale) return;
    setSelected(i);
    setShowRationale(true);
    
    // If correct, save mastery
    if (currentQ && i === currentQ.correctIndex) {
        const m = JSON.parse(localStorage.getItem("mastered-ids") || "[]");
        if (!m.includes(currentQ.id)) {
            localStorage.setItem("mastered-ids", JSON.stringify([...m, currentQ.id]));
        }
    }
  };

  const next = () => {
    if (idx < pool.length - 1) {
      setIdx(i => i + 1);
      setSelected(null);
      setShowRationale(false);
    } else {
      router.push("/study");
    }
  };

  if (!currentQ) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">INITIALIZING...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <header className="p-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-10 flex justify-between items-center">
        <Link href="/study" className="text-xs font-bold text-slate-400 hover:text-white">← EXIT</Link>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">{category}</div>
        <div className="text-xs font-mono text-slate-500">{idx + 1}/{pool.length}</div>
      </header>

      <main className="flex-1 p-6 max-w-xl mx-auto w-full flex flex-col justify-center pb-32">
        <h2 className="text-xl font-bold mb-8 leading-relaxed">{currentQ.text}</h2>
        
        <div className="space-y-3">
          {currentQ.options.map((opt, i) => {
            let style = "border-slate-800 bg-slate-900 text-slate-300";
            if (showRationale) {
              if (i === currentQ.correctIndex) style = "border-emerald-500 bg-emerald-900/20 text-emerald-400";
              else if (i === selected) style = "border-red-500 bg-red-900/20 text-red-400";
              else style = "border-slate-800 opacity-50";
            } else if (i === selected) {
              style = "border-amber-500 bg-amber-900/20 text-white";
            }

            return (
              <button 
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${style}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </main>

      <AnimatePresence>
        {showRationale && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-6 z-20 shadow-2xl"
          >
            <div className="max-w-xl mx-auto">
              <div className="font-bold text-white mb-1">Rationale</div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{currentQ.explanation}</p>
              <button onClick={next} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl">
                {idx < pool.length - 1 ? "Next Question" : "Complete Module"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StationPage() {
  return <Suspense><StationContent /></Suspense>;
}
