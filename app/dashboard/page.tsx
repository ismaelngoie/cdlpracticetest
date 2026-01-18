"use client";

import Dock from "@/components/Dock";
import TruckSchematic from "@/components/TruckSchematic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [userName, setUserName] = useState("OPERATOR");
  const [license, setLicense] = useState("A");
  const [score, setScore] = useState(0);
  const [userState, setUserState] = useState("TX");
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [salary, setSalary] = useState("75,000");
  const [daysToExam, setDaysToExam] = useState(14);

  // --- INIT ---
  useEffect(() => {
    // 1. Hydrate User Data
    setLicense(localStorage.getItem("userLevel") || "A");
    setUserState(localStorage.getItem("userState") || "TX");
    
    // 2. Load Performance Data
    const s = parseInt(localStorage.getItem("diagnosticScore") || "45");
    setScore(s);
    setWeakDomain(localStorage.getItem("weakestDomain") || "Air Brakes");
    
    // 3. Calculate "Salary Potential" based on license (Psychological hook)
    const base = localStorage.getItem("userLevel") === "A" ? 75000 : 55000;
    const ends = JSON.parse(localStorage.getItem("userEndorsements") || "[]").length * 5000;
    setSalary((base + ends).toLocaleString());
  }, []);

  // --- COMPUTED VISUALS ---
  const statusColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-500" : "text-red-500";
  const statusBorder = score >= 80 ? "border-emerald-500/50" : score >= 60 ? "border-amber-500/50" : "border-red-500/50";
  const statusGlow = score >= 80 ? "shadow-emerald-500/20" : score >= 60 ? "shadow-amber-500/20" : "shadow-red-500/20";
  const statusText = score >= 80 ? "ROAD READY" : "CRITICAL REPAIRS NEEDED";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-hidden font-sans">
      
      {/* 1. INDUSTRIAL BACKGROUND FX */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className={`fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b ${score >= 80 ? "from-emerald-900/20" : "from-amber-900/20"} to-transparent blur-[120px] pointer-events-none`} />

      {/* 2. HUD HEADER */}
      <header className="relative z-40 px-6 py-5 flex justify-between items-start border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${score >= 80 ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              System Online • v4.2
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tighter">
            {userName} <span className="text-slate-600 mx-1">/</span> CLASS {license}
          </h1>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex gap-3">
            <span>JURISDICTION: <span className="text-white">{userState}</span></span>
            <span>TARGET: <span className="text-white">CDL-{license}</span></span>
          </div>
        </div>

        <div className="text-right">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Readiness</span>
            <div className={`text-3xl font-mono font-black ${statusColor} leading-none`}>
              {score}%
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-xl mx-auto relative z-10 space-y-5">
        
        {/* 3. TRUCK SCHEMATIC CARD (Interactive & Dense) */}
        <section className={`relative bg-slate-900/50 border ${statusBorder} rounded-2xl overflow-hidden shadow-2xl ${statusGlow}`}>
          {/* Tech lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50" />
          <div className="absolute top-4 left-4 flex gap-1">
            <div className="w-1 h-1 bg-slate-500 rounded-full" />
            <div className="w-1 h-1 bg-slate-500 rounded-full" />
            <div className="w-1 h-1 bg-slate-500 rounded-full" />
          </div>

          <div className="p-4 pb-0 flex justify-between items-start">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Vehicle Diagnostics
            </div>
            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${score >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {score >= 80 ? "ALL SYSTEMS GO" : "WARNING"}
            </div>
          </div>

          {/* The Truck Viz */}
          <div className="relative">
            <TruckSchematic />
            
            {/* Context Stats Overlay */}
            <div className="absolute top-10 left-4 space-y-2 pointer-events-none hidden sm:block">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${weakDomain === "Air Brakes" ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                <span className="text-[9px] font-mono text-slate-400">AIR BRAKES</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${weakDomain === "General Knowledge" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span className="text-[9px] font-mono text-slate-400">CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="text-[9px] font-mono text-slate-600">COUPLING</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MISSION CONTROL (Actionable Buttons) */}
        <motion.section 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-1 rounded-2xl shadow-xl"
        >
          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Daily Manifest
                </h3>
                <h2 className="text-lg font-bold text-white">
                  Fix Priority: <span className="text-amber-500">{weakDomain}</span>
                </h2>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-slate-500 font-mono">EST. EXAM DATE</div>
                <div className="text-sm font-bold text-white">T-MINUS {daysToExam} DAYS</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* PRIMARY ACTION: DRILL */}
              <Link 
                href={`/station?category=${encodeURIComponent(weakDomain)}`}
                className="group relative w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-between px-6 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Repair System (15m)
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
              </Link>

              {/* SECONDARY ACTION: SIMULATOR */}
              <Link 
                href="/simulator"
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Run Full Exam Sim
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 5. DATA GRID */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
            <div className="absolute right-2 top-2 text-emerald-500/20">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/></svg>
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Est. Salary</div>
            <div className="text-xl font-mono font-black text-emerald-400">${salary}</div>
            <div className="text-[9px] text-slate-600 mt-1 font-mono">MARKET RATE ({userState})</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
             <div className="absolute right-2 top-2 text-blue-500/20">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Knowledge Bank</div>
            <div className="text-xl font-mono font-black text-white">12<span className="text-slate-600 text-sm font-bold">/300</span></div>
            <div className="text-[9px] text-slate-600 mt-1 font-mono">MASTERED ITEMS</div>
          </div>
        </section>

      </main>

      <Dock />
    </div>
  );
}
