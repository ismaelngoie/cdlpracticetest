"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Configuration Types ---
type LicenseClass = "A" | "B" | "C" | "D";
type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger";

// --- Components ---
const Counter = ({ value }: { value: number }) => {
  // Simple count-up effect
  return <span className="tabular-nums tracking-tight">${value.toLocaleString()}</span>;
};

export default function Home() {
  const router = useRouter();

  // --- State ---
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Salary Calculator ---
  const salaryData = useMemo(() => {
    let base = 45000;
    if (license === "A") base += 25000;
    if (license === "B") base += 10000;
    
    // Calculate potential additives
    const breakdown = [];
    if (endorsements.includes("Hazmat")) { base += 12000; breakdown.push({ label: "HAZMAT PREMIUM", val: 12000 }); }
    if (endorsements.includes("Tanker")) { base += 8000; breakdown.push({ label: "LIQUID CARGO", val: 8000 }); }
    if (endorsements.includes("Doubles/Triples")) { base += 15000; breakdown.push({ label: "HEAVY HAUL", val: 15000 }); }
    if (endorsements.includes("Air Brakes")) { base += 2000; breakdown.push({ label: "TECHNICAL", val: 2000 }); }

    return { total: base, breakdown };
  }, [license, endorsements]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) => 
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const startDiagnostic = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("userLevel", license);
      localStorage.setItem("userEndorsements", JSON.stringify(endorsements));
      localStorage.setItem("userState", userState);
      router.push("/dashboard"); // Redirect to the dashboard we built earlier
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30 overflow-hidden relative">
      
      {/* 1. GLOBAL BACKGROUND FX */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
         <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-16 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-screen">
        
        {/* LEFT COLUMN: The "Hook" & Value Prop */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-mono tracking-widest uppercase mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              System Online • v4.2 Live
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">
              PASS YOUR <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">CDL EXAM</span> <br/>
              FIRST TRY.
            </h1>
          </div>

          <p className="text-slate-400 text-lg md:text-xl max-w-md leading-relaxed">
            Don't rely on luck. Our tactical diagnostic engine simulates the real exam environment to pinpoint your weak spots before you pay the testing fee.
          </p>

          {/* Social Proof / Live Stats */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-8">
            <div>
              <div className="text-3xl font-black text-white">98.4%</div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Pass Rate</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">12k+</div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Active Drivers</div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: The Interactive Configurator */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2, duration: 0.6 }}
           className="relative"
        >
          {/* Decorative Glow behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-700 rounded-3xl blur opacity-20 animate-pulse" />
          
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl">
            
            {/* Header of Card */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Configure Loadout</h3>
                <h2 className="text-2xl font-black text-white">Target License</h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Est. Market Salary</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {mounted ? <Counter value={salaryData.total} /> : "$---,---"}
                </div>
              </div>
            </div>

            {/* STEP 1: LICENSE GRID */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {(["A", "B", "C", "D"] as LicenseClass[]).map((cls) => (
                <button 
                  key={cls} 
                  onClick={() => setLicense(cls)}
                  className={`relative py-4 rounded-xl border transition-all duration-200 group overflow-hidden ${
                    license === cls 
                    ? "bg-slate-800 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <span className={`relative z-10 text-xl font-black ${license === cls ? "text-white" : "text-slate-500"}`}>{cls}</span>
                  {license === cls && <div className="absolute inset-0 bg-amber-500/10 z-0" />}
                </button>
              ))}
            </div>

            {/* STEP 2: ENDORSEMENTS LIST */}
            <div className="space-y-3 mb-8">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Available Endorsements
              </label>
              {(["Air Brakes", "Hazmat", "Tanker", "Doubles/Triples"] as Endorsement[]).map((end) => {
                const active = endorsements.includes(end);
                return (
                  <button 
                    key={end} 
                    onClick={() => toggleEndorsement(end)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      active 
                      ? "bg-slate-800/80 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                      : "bg-slate-950/30 border-slate-800 text-slate-500 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        active ? "bg-emerald-500 text-black" : "bg-slate-800 border border-slate-700"
                      }`}>
                        {active && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`font-bold text-sm ${active ? "text-white" : "text-slate-400"}`}>{end}</span>
                    </div>
                    
                    {/* Dynamic Salary Badge */}
                    <div className={`text-[10px] font-mono py-1 px-2 rounded ${active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-900 text-slate-600"}`}>
                       {end === "Hazmat" && "+$12k"}
                       {end === "Tanker" && "+$8k"}
                       {end === "Doubles/Triples" && "+$15k"}
                       {end === "Air Brakes" && "REQ"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* STEP 3: JURISDICTION & CTA */}
            <div className="flex gap-4">
              <div className="w-1/3">
                 <select 
                   value={userState} 
                   onChange={(e) => setUserState(e.target.value)}
                   className="w-full h-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 text-sm font-bold focus:border-amber-500 focus:outline-none appearance-none text-center"
                 >
                   <option value="TX">TX</option>
                   <option value="CA">CA</option>
                   <option value="NY">NY</option>
                   <option value="FL">FL</option>
                 </select>
              </div>
              <button 
                onClick={startDiagnostic}
                className="flex-1 py-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                Start Diagnostic
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-[10px] text-slate-500 font-mono">
                SECURE CONNECTION • 256-BIT ENCRYPTED
              </p>
            </div>

          </div>
        </motion.div>

      </div>
    </main>
  );
}
