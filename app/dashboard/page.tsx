"use client";

import Dock from "@/components/Dock";
import TruckSchematic from "@/components/TruckSchematic";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

// --- HELPER COMPONENTS ---

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

function BentoCard({ children, className, glowColor = "amber" }: { children: React.ReactNode; className?: string; glowColor?: "amber" | "emerald" | "red" }) {
  const glow = 
    glowColor === "emerald" ? "shadow-emerald-500/10 border-emerald-500/20" : 
    glowColor === "red" ? "shadow-red-500/10 border-red-500/20" : 
    "shadow-amber-500/10 border-amber-500/20";

  return (
    <div className={`bg-slate-900/80 backdrop-blur-md border rounded-3xl relative overflow-hidden ${glow} ${className}`}>
      {children}
    </div>
  );
}

// --- MAIN PAGE ---

export default function DashboardPage() {
  const [userName, setUserName] = useState("OPERATOR");
  const [license, setLicense] = useState("A");
  const [score, setScore] = useState(0);
  const [userState, setUserState] = useState("TX");
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [salary, setSalary] = useState("75,000");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLicense(localStorage.getItem("userLevel") || "A");
    setUserState(localStorage.getItem("userState") || "TX");
    setScore(parseInt(localStorage.getItem("diagnosticScore") || "45"));
    setWeakDomain(localStorage.getItem("weakestDomain") || "Air Brakes");
    
    // Salary calculation
    const base = localStorage.getItem("userLevel") === "A" ? 75000 : 55000;
    const ends = JSON.parse(localStorage.getItem("userEndorsements") || "[]").length * 5000;
    setSalary((base + ends).toLocaleString());
  }, []);

  // Visual Logic
  const passed = score >= 80;
  const risk = score < 60;
  
  const theme = {
    color: passed ? "text-emerald-400" : risk ? "text-red-500" : "text-amber-500",
    glow: passed ? "emerald" : risk ? "red" : "amber" as "amber" | "emerald" | "red",
    bg: passed ? "bg-emerald-500" : risk ? "bg-red-500" : "bg-amber-500",
  };

  // Radial Graph Math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-hidden font-sans">
      
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
      
      {/* Header */}
      <header className="relative z-40 px-6 pt-6 pb-2 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${theme.bg}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              System Online
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tighter">
            {userName} <span className="text-slate-600 mx-1">/</span> CLASS {license}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-mono">JURISDICTION</div>
          <div className="text-sm font-bold text-slate-300">{userState}</div>
        </div>
      </header>

      {/* Main BENTO GRID */}
      <main className="p-4 max-w-xl mx-auto relative z-10 grid grid-cols-2 gap-3">
        
        {/* 1. VEHICLE DIAGNOSTICS (Truck) - Spans full width */}
        <BentoCard className="col-span-2 p-0 h-[280px]" glowColor={theme.glow}>
          <div className="absolute top-4 left-4 z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle Diagnostics</h3>
            <p className="text-[10px] text-slate-500">REAL-TIME TELEMETRY</p>
          </div>
          
          <div className="absolute top-4 right-4 z-10">
             <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase border bg-opacity-10 ${passed ? 'border-emerald-500 bg-emerald-500 text-emerald-400' : 'border-amber-500 bg-amber-500 text-amber-500'}`}>
                {passed ? "ALL SYSTEMS GO" : "Check Engine"}
             </div>
          </div>

          <div className="pt-8">
            <TruckSchematic />
          </div>
        </BentoCard>

        {/* 2. EXAM READINESS (Radial Graph) - Spans full width */}
        <BentoCard className="col-span-2 p-6 flex flex-row items-center justify-between gap-4" glowColor={theme.glow}>
           <div className="space-y-1 flex-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Readiness</h3>
              <p className="text-[10px] text-slate-500">BASED ON RECENT SIMS</p>
              
              <div className="pt-2">
                <div className="text-2xl font-black text-white">
                   {passed ? "PASSING" : "AT RISK"}
                </div>
                <div className="text-xs text-slate-400 leading-tight mt-1">
                   You need <span className="text-white font-bold">+{Math.max(0, 80 - score)} pts</span> to guarantee a pass on exam day.
                </div>
              </div>
           </div>

           {/* The Graph */}
           <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90">
                {/* Track */}
                <circle cx="50%" cy="50%" r={radius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
                {/* Indicator */}
                <circle 
                  cx="50%" cy="50%" r={radius} 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={mounted ? offset : circumference}
                  strokeLinecap="round"
                  className={`${theme.color} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={`text-2xl font-black ${theme.color}`}>
                  <AnimatedNumber value={score} />%
                </span>
              </div>
           </div>
        </BentoCard>

        {/* 3. DAILY MANIFEST (Action) - Spans full width */}
        <BentoCard className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 p-5" glowColor="amber">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                Daily Manifest
              </h3>
              <h2 className="text-lg font-bold text-white">
                Fix Priority: <span className="text-amber-500">{weakDomain}</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link 
              href={`/station?category=${encodeURIComponent(weakDomain)}`}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>🛠️</span> Repair System (15m)
            </Link>

            <Link 
              href="/simulator"
              className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <span>🚛</span> Run Full Exam
            </Link>
          </div>
        </BentoCard>

        {/* 4. SALARY STATS - Left Col */}
        <BentoCard className="p-4 flex flex-col justify-center" glowColor="emerald">
           <div className="text-emerald-500 mb-2">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
           </div>
           <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Est. Salary</div>
           <div className="text-lg font-mono font-black text-white">${salary}</div>
        </BentoCard>

        {/* 5. KNOWLEDGE BANK - Right Col */}
        <BentoCard className="p-4 flex flex-col justify-center" glowColor="amber">
           <div className="text-blue-500 mb-2">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
           </div>
           <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Manuals</div>
           <div className="text-lg font-mono font-black text-white">12<span className="text-slate-600 text-xs">/300</span></div>
        </BentoCard>

      </main>

      <Dock />
    </div>
  );
}
