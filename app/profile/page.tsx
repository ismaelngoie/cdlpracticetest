"use client";

import { useState, useEffect } from "react";
import Dock from "@/components/Dock";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const [license, setLicense] = useState("A");
  const [name, setName] = useState("OPERATOR");
  const [endorsements, setEndorsements] = useState<string[]>([]);
  const [stats, setStats] = useState({ exams: 0, passed: 0 });

  useEffect(() => {
    setLicense(localStorage.getItem("userLevel") || "A");
    setName("OPERATOR"); // In a real app, this would be user input
    const endRaw = localStorage.getItem("userEndorsements");
    setEndorsements(endRaw ? JSON.parse(endRaw) : []);
    
    // Fake stats logic for demo (or read from localStorage keys if we implemented history)
    setStats({ exams: 12, passed: 8 });
  }, []);

  const handleReset = () => {
    if (confirm("Factory Reset: This will wipe all progress. Confirm?")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-white">Driver Logbook</h1>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-6">
        
        {/* CDL CARD VISUAL */}
        <motion.div 
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          className="bg-gradient-to-br from-slate-200 to-slate-400 rounded-2xl p-5 text-slate-900 shadow-xl relative overflow-hidden border-t-4 border-amber-500"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Commercial Driver License
              </div>
              <div className="font-black text-2xl mt-1">CLASS {license}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500">EXP 2029</div>
              <div className="text-amber-600 font-bold text-xs">HAUL.OS VERIFIED</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs border-b border-slate-900/10 pb-1">
              <span className="font-bold text-slate-500">ENDORSEMENTS</span>
              <span className="font-mono font-bold">{endorsements.map(e => e[0]).join("") || "NONE"}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-900/10 pb-1 pt-1">
              <span className="font-bold text-slate-500">RESTRICTIONS</span>
              <span className="font-mono font-bold">NONE</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="font-bold text-slate-500">STATUS</span>
              <span className="font-mono font-bold text-emerald-700">ACTIVE</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-white">{stats.exams}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Sims Run</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-emerald-400">{stats.passed}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Passed</div>
          </div>
        </div>

        {/* Settings / Actions */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">System Controls</h3>
          
          <button 
            onClick={() => window.location.href = "/"}
            className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm font-bold text-slate-300">Reconfigure Rig (Change Class)</span>
            <span className="text-slate-500">→</span>
          </button>

          <button 
            className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm font-bold text-slate-300">Manage Subscription</span>
            <span className="text-slate-500">↗</span>
          </button>

          <button 
            onClick={handleReset}
            className="w-full flex items-center justify-between p-4 bg-red-900/10 border border-red-900/30 rounded-xl hover:bg-red-900/20 transition-colors"
          >
            <span className="text-sm font-bold text-red-400">Factory Reset</span>
            <span className="text-red-500">⚠️</span>
          </button>
        </div>

      </main>
      <Dock />
    </div>
  );
}
