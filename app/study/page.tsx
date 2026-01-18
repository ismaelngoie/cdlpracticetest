"use client";

import { useState, useEffect, useMemo } from "react";
import Dock from "@/components/Dock";
import Link from "next/link";
import { motion } from "framer-motion";
import { questions, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- Industrial Icon Mapping ---
const ICONS: Record<string, string> = {
  "Air Brakes": "💨",
  "Combination Vehicles": "🔗",
  "Doubles/Triples": "🚛",
  "Driving Safely": "🛡️",
  "General Knowledge": "🧠",
  "Hazardous Materials": "☢️",
  "Passenger": "👥",
  "Pre-Trip Inspection": "🔍",
  "School Bus": "🚸",
  "Tank Vehicles": "💧",
  "Transporting Cargo": "📦",
  "Vehicle Control": "⚙️",
  "Safety Systems": "🚨",
};

export default function StudyPage() {
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");
  const [masteredIds, setMasteredIds] = useState<number[]>([]);

  useEffect(() => {
    setLicense((localStorage.getItem("userLevel") as LicenseClass) || "A");
    const endRaw = localStorage.getItem("userEndorsements");
    setEndorsements(endRaw ? JSON.parse(endRaw) : []);
    setUserState(localStorage.getItem("userState") || "TX");
    
    const m = localStorage.getItem("mastered-ids");
    setMasteredIds(m ? JSON.parse(m) : []);
  }, []);

  // Filter categories based on License + Endorsements
  const categories = useMemo(() => {
    const relevantQs = questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        return q.endorsements.some((e) => endorsements.includes(e));
      }
      return true;
    });
    
    const cats = Array.from(new Set(relevantQs.map((q) => q.category)));
    return cats.sort();
  }, [license, endorsements]);

  const getStats = (cat: string) => {
    const catQs = questions.filter(q => q.category === cat && q.licenseClasses.includes(license));
    const total = catQs.length;
    const mastered = catQs.filter(q => masteredIds.includes(q.id)).length;
    const pct = total ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, pct };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_60%)]" />

      <header className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">
          Technical Manuals
        </h1>
        <p className="text-sm text-slate-400 font-mono">
          RIG CONFIGURATION: <span className="text-amber-500">CLASS {license}</span>
        </p>
      </header>

      <main className="px-4 max-w-lg mx-auto space-y-4">
        
        {/* State Cheat Sheet (High Value Feature) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
              JURISDICTION DATA
            </div>
            <div className="font-bold text-white text-sm">
              {userState} Commercial Fines & Limits
            </div>
          </div>
          <button className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded hover:bg-emerald-500/30 border border-emerald-500/30">
            VIEW PDF
          </button>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-3">
          {categories.map((cat, i) => {
            const { pct, mastered, total } = getStats(cat);
            return (
              <Link 
                key={cat}
                href={`/station?mode=study&category=${encodeURIComponent(cat)}`}
                className="group relative bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-amber-500/50 transition-all overflow-hidden"
              >
                {/* Progress Bar Background */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-slate-800/50 transition-all duration-1000" 
                  style={{ width: `${pct}%` }} 
                />

                <div className="relative flex items-center justify-between z-10">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{ICONS[cat] || "📂"}</span>
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-white">{cat}</div>
                      <div className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                        MASTERY: {pct}% ({mastered}/{total})
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black transition-colors text-slate-500">
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </main>
      <Dock />
    </div>
  );
}
