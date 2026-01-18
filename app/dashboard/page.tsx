"use client";

import Dock from "@/components/Dock";
import TruckSchematic from "@/components/TruckSchematic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- TYPES ---
interface AnimatedNumberProps {
  value: number;
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "amber" | "red" | "slate" | "blue";
}

// --- ANIMATION VARIANTS ---
const containerVar = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVar = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
};

// --- UTILITY COMPONENTS ---

// A "CountUp" component makes data feel real and computed live
const AnimatedNumber = ({ value }: AnimatedNumberProps) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4); 
      
      setDisplay(Math.floor(start + (value - start) * ease));
      
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{display.toLocaleString()}</span>;
};

// A premium "Card" wrapper with subtle gradients and glass effects
const BentoCard = ({ children, className = "", glowColor = "slate" }: BentoCardProps) => {
  const glows = {
    emerald: "shadow-emerald-500/10 border-emerald-500/20",
    amber: "shadow-amber-500/10 border-amber-500/20",
    red: "shadow-red-500/10 border-red-500/20",
    slate: "shadow-slate-500/10 border-slate-800",
    blue: "shadow-blue-500/10 border-blue-500/20"
  };

  return (
    <motion.div 
      variants={itemVar}
      className={`relative bg-slate-900/60 backdrop-blur-md border rounded-2xl overflow-hidden shadow-xl ${glows[glowColor]} ${className}`}
    >
      {/* Top Highlight for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [userName, setUserName] = useState("OPERATOR");
  const [license, setLicense] = useState("A");
  const [score, setScore] = useState(0);
  const [userState, setUserState] = useState("TX");
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [salary, setSalary] = useState(75000);
  const [daysToExam, setDaysToExam] = useState(14);
  const [mounted, setMounted] = useState(false);

  // --- INIT ---
  useEffect(() => {
    setMounted(true);
    // Simulating data fetch for smoothness
    const storedLevel = localStorage.getItem("userLevel") || "A";
    setLicense(storedLevel);
    setUserState(localStorage.getItem("userState") || "TX");
    
    const s = parseInt(localStorage.getItem("diagnosticScore") || "45");
    setScore(s);
    setWeakDomain(localStorage.getItem("weakestDomain") || "Air Brakes");
    
    const base = storedLevel === "A" ? 75000 : 55000;
    const ends = JSON.parse(localStorage.getItem("userEndorsements") || "[]").length * 5000;
    setSalary(base + ends);
  }, []);

  // --- COMPUTED VISUALS ---
  const getStatusTheme = (s: number) => {
    if (s >= 80) return { color: "text-emerald-400", bg: "bg-emerald-500", glow: "emerald" as const };
    if (s >= 60) return { color: "text-amber-400", bg: "bg-amber-500", glow: "amber" as const };
    return { color: "text-red-400", bg: "bg-red-500", glow: "red" as const };
  };

  const theme = getStatusTheme(score);
  const circleCircumference = 2 * Math.PI * 40; // for SVG radius 40
  const circleOffset = circleCircumference - (score / 100) * circleCircumference;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-x-hidden font-sans selection:bg-amber-500/30">
      
      {/* 1. CINEMATIC BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Subtle grid moving slowly */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        {/* Ambient Glow */}
        <div className={`absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-${theme.glow}-600/10 blur-[120px] rounded-full mix-blend-screen`} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <motion.main 
        variants={containerVar}
        initial="hidden"
        animate="show"
        className="relative z-10 px-4 pt-4 md:px-8 max-w-7xl mx-auto space-y-6"
      >
        
        {/* 2. HUD HEADER (Redesigned for density) */}
        <header className="flex flex-col md:flex-row justify-between items-end md:items-center py-4 border-b border-white/5 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 shadow-inner`}>
              <span className="font-black text-xl text-slate-500">{license}</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {userName}
              </h1>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
                <span>•</span>
                <span>{userState} JURISDICTION</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block text-right">
             <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Current Objective</div>
             <div className="text-white font-medium">CDL Class {license} Certification</div>
          </div>
        </header>

        {/* 3. BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          
          {/* A. SCORES (Span 4) - Now with Radial Graph */}
          <BentoCard className="md:col-span-4 p-6 flex flex-col justify-between" glowColor={theme.glow}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Readiness</h3>
                <p className="text-[10px] text-slate-500 mt-1">BASED ON RECENT SIMS</p>
              </div>
              <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${theme.color === 'text-emerald-400' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'} ${theme.color}`}>
                {score >= 80 ? "PASSING" : "AT RISK"}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Radial Progress */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  <circle 
                    cx="50%" cy="50%" r="40" 
                    stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={mounted ? circleOffset : circleCircumference}
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
              
              <div className="space-y-1">
                <div className="text-sm text-slate-300">Projected Result</div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  You need <span className="text-white font-bold">+{(80-score) > 0 ? 80-score : 0}%</span> to guarantee a pass on exam day.
                </div>
              </div>
            </div>
          </BentoCard>

          {/* B. ACTION CENTER (Span 8) - High Contrast */}
          <BentoCard className="md:col-span-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 h-full flex flex-col justify-center relative z-10">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Daily Priority: {weakDomain}</h2>
                    <p className="text-slate-400 text-sm max-w-md mb-6">
                      Our algorithms detected a weakness in <span className="text-white">{weakDomain}</span>. 
                      Spending 15 minutes now boosts your pass probability by 12%.
                    </p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-3xl font-black text-white">{daysToExam}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Days Left</div>
                  </div>
               </div>

               <div className="flex gap-3">
                 <Link 
                   href={`/station?category=${encodeURIComponent(weakDomain)}`}
                   className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wide py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   Start Repair Drill
                 </Link>
                 <Link 
                   href="/simulator"
                   className="px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-wide border border-slate-700 transition-colors"
                 >
                   Simulate
                 </Link>
               </div>
            </div>
          </BentoCard>

          {/* C. TRUCK SCHEMATIC (Span 8, Row 2) - The "Toy" */}
          <BentoCard className="md:col-span-8 h-[300px] bg-slate-900 relative" glowColor="blue">
            <div className="absolute top-4 left-4 z-10">
               <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-2">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                 Live Diagnostics
               </div>
            </div>
            
            {/* Simulated Scanning Line Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
               <div className="w-full h-[2px] bg-blue-500/50 blur-[1px] absolute top-0 animate-[scan_3s_ease-in-out_infinite]" />
            </div>

            <div className="flex items-center justify-center h-full opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
               {/* Pass props to child to animate parts based on weakDomain */}
               <TruckSchematic highlight={weakDomain} />
            </div>
          </BentoCard>

          {/* D. FINANCIALS (Span 4, Row 2) */}
          <BentoCard className="md:col-span-4 p-6 flex flex-col justify-center" glowColor="emerald">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Salary</div>
                  <div className="text-xs text-emerald-400 font-mono">MARKET RATE ({userState})</div>
                </div>
             </div>
             
             <div className="text-4xl font-black text-white tracking-tight mb-2">
               $<AnimatedNumber value={salary} />
             </div>
             
             <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "75%" }}
                   transition={{ delay: 0.5, duration: 1 }}
                   className="h-full bg-emerald-500" 
                />
             </div>
             <p className="text-[10px] text-slate-400 text-right">Top 25% of earners</p>
          </BentoCard>

        </div>

      </motion.main>
      
      {/* 4. FLOATING DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Dock />
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
