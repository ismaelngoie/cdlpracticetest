"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- CONSTANTS ---
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

// --- Configuration Types ---
type LicenseClass = "A" | "B" | "C" | "D";
type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger";

export default function Home() {
  const router = useRouter();

  // --- State ---
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // --- Salary Calculator Logic ---
  const estimatedSalary = useMemo(() => {
    let base = 45000;
    if (license === "A") base += 25000; 
    if (license === "B") base += 10000; 
    
    // Add value for endorsements
    if (endorsements.includes("Hazmat")) base += 12000;
    if (endorsements.includes("Tanker")) base += 8000;
    if (endorsements.includes("Doubles/Triples")) base += 15000; 
    if (endorsements.includes("Air Brakes")) base += 2000; 

    return base.toLocaleString();
  }, [license, endorsements]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) =>
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const startDiagnostic = () => {
    localStorage.setItem("userLevel", license);
    localStorage.setItem("userEndorsements", JSON.stringify(endorsements));
    localStorage.setItem("userState", userState);
    router.push("/sim");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      
      {/* Background Grid FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 md:py-16">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-mono tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            System Online • v4.2
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-4 leading-[0.9]">
            HAUL<span className="text-amber-500">.OS</span>
          </h1>
          
          <p className="text-slate-400 text-sm md:text-base font-mono uppercase tracking-widest mb-8">
            Commercial Driver Command Center
          </p>

          {/* Social Proof Data Stream */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-emerald-400">98.8%</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pass Rate</span>
            </div>
            <div className="w-px h-10 bg-slate-800 hidden md:block"></div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-white">12,400+</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Drivers</span>
            </div>
            <div className="w-px h-10 bg-slate-800 hidden md:block"></div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-amber-500">50</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">States Supported</span>
            </div>
          </div>
        </motion.div>

        {/* The Configurator Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

          {/* STEP 1: LICENSE CLASS */}
          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 1: Select Rig Class
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as LicenseClass[]).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setLicense(cls)}
                  className={`relative p-4 rounded-xl border text-left transition-all group ${
                    license === cls
                      ? "bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-3xl font-black ${license === cls ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                      {cls}
                    </span>
                    {license === cls && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono uppercase font-bold tracking-wide">
                    {cls === "A" && "Combination (Semi)"}
                    {cls === "B" && "Heavy Straight"}
                    {cls === "C" && "Transport / Hazmat"}
                    {cls === "D" && "Standard Ops"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: ENDORSEMENTS */}
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Step 2: Add Modules
              </label>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold mb-1">EST. YEARLY SALARY</div>
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={estimatedSalary}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-mono font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded inline-block"
                  >
                    ${estimatedSalary}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              {(["Air Brakes", "Hazmat", "Tanker", "Doubles/Triples"] as Endorsement[]).map((end) => {
                const active = endorsements.includes(end);
                return (
                  <button
                    key={end}
                    onClick={() => toggleEndorsement(end)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                      active
                        ? "bg-slate-800 border-emerald-500/50"
                        : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        active ? "bg-emerald-500 border-emerald-500" : "border-slate-600"
                      }`}>
                        {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      <span className={`text-sm font-bold ${active ? "text-white" : "text-slate-400"}`}>
                        {end}
                      </span>
                    </div>
                    {active && <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-bold">+SALARY</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: JURISDICTION */}
          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 3: Jurisdiction
            </label>
            <div className="relative">
              <select 
                value={userState}
                onChange={(e) => setUserState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 text-sm font-bold focus:border-amber-500 focus:outline-none appearance-none cursor-pointer hover:border-slate-600 transition-colors"
              >
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                ▼
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={startDiagnostic}
            className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-wider rounded-xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.6)] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group"
          >
            <span>Initialize Diagnostic</span>
            <span className="opacity-70 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-4">
              <span>🔒 100% ANONYMOUS</span>
              <span>•</span>
              <span>NO CREDIT CARD REQUIRED</span>
            </p>
          </div>

        </motion.div>
      </div>
    </main>
  );
}
