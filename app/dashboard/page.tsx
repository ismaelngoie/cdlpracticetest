"use client";

import Dock from "@/components/Dock";
import TruckSchematic from "@/components/TruckSchematic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("OPERATOR");
  const [license, setLicense] = useState("Class A");
  const [score, setScore] = useState(42);
  const [userState, setUserState] = useState("TX");

  useEffect(() => {
    // Hydrate from local storage
    setLicense(`Class ${localStorage.getItem("userLevel") || "A"}`);
    setScore(parseInt(localStorage.getItem("diagnosticScore") || "42"));
    setUserState(localStorage.getItem("userState") || "TX");
  }, []);

  const statusColor = score >= 80 ? "text-emerald-400" : "text-amber-500";
  const statusText = score >= 80 ? "ROAD READY" : "INSPECTION PENDING";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Header HUD */}
      <header className="relative z-40 p-6 flex justify-between items-end border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">System Online</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {userName} <span className="text-slate-600">/</span> {license}
          </h1>
          <div className="text-[10px] text-amber-500 font-mono mt-1">JURISDICTION: {userState}</div>
        </div>

        <div className="text-right">
          <div className={`text-3xl font-black ${statusColor}`}>
            {score}%
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {statusText}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-lg mx-auto relative z-10 space-y-4">
        
        {/* Truck Viz */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="absolute top-3 left-4 text-[10px] text-slate-500 font-mono">VEHICLE DIAGNOSTIC</div>
          <TruckSchematic />
        </section>

        {/* Daily Mission */}
        <motion.section 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl relative overflow-hidden"
        >
          {/* Decorative Stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
            Daily Manifest
          </h3>
          <h2 className="text-xl font-bold text-white mb-4">
            Repair "Air Brakes" Knowledge
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <button className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2">
              Start 15-Min Drill <span>→</span>
            </button>
            <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all">
              Run Full Simulator
            </button>
          </div>
        </motion.section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Est. Salary</div>
            <div className="text-xl font-mono font-bold text-emerald-400">$75,000</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Questions</div>
            <div className="text-xl font-mono font-bold text-white">12<span className="text-slate-600 text-sm">/3000</span></div>
          </div>
        </section>

      </main>

      <Dock />
    </div>
  );
}
