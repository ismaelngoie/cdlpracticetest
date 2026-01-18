"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Configuration Types ---
type LicenseClass = "A" | "B" | "C" | "D";
type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger";

export default function Home() {
  const router = useRouter();

  // --- State: The User's "Load Out" ---
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX"); // Default to Texas for demo

  // --- Salary Calculator Logic ---
  // This is the "Hook" - showing them the value of studying harder
  const estimatedSalary = useMemo(() => {
    let base = 45000;
    if (license === "A") base += 25000; // Class A base ~70k
    if (license === "B") base += 10000; // Class B base ~55k
    
    // Add value for endorsements
    if (endorsements.includes("Hazmat")) base += 12000;
    if (endorsements.includes("Tanker")) base += 8000;
    if (endorsements.includes("Doubles/Triples")) base += 15000; // High value
    if (endorsements.includes("Air Brakes")) base += 2000; // Basic requirement often

    return base.toLocaleString();
  }, [license, endorsements]);

  const toggleEndorsement = (e: Endorsement) => {
    setEndorsements((prev) =>
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const startDiagnostic = () => {
    // Save their "Rig" configuration
    localStorage.setItem("userLevel", license); // "A", "B", etc.
    localStorage.setItem("userEndorsements", JSON.stringify(endorsements));
    localStorage.setItem("userState", userState);
    
    // Launch the Simulator
    router.push("/sim");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      
      {/* Background Grid FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 md:py-20">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-mono tracking-widest uppercase mb-4">
            System Online • v4.0.2
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-2">
            HAUL<span className="text-amber-500">.OS</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-mono">
            COMMERCIAL DRIVER COMMAND CENTER
          </p>
        </motion.div>

        {/* The Configurator Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

          {/* STEP 1: LICENSE CLASS */}
          <div className="mb-8">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 1: Select Rig Class
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as LicenseClass[]).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setLicense(cls)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    license === cls
                      ? "bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-2xl font-black ${license === cls ? "text-white" : "text-slate-400"}`}>
                      {cls}
                    </span>
                    {license === cls && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono uppercase">
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
          <div className="mb-8">
            <div className="flex justify-between items-end mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Step 2: Add Modules (Endorsements)
              </label>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">EST. YEARLY SALARY</div>
                <div className="text-lg font-mono font-bold text-emerald-400">
                  ${estimatedSalary}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(["Air Brakes", "Hazmat", "Tanker", "Doubles/Triples"] as Endorsement[]).map((end) => {
                const active = endorsements.includes(end);
                return (
                  <button
                    key={end}
                    onClick={() => toggleEndorsement(end)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      active
                        ? "bg-slate-800 border-emerald-500/50"
                        : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        active ? "bg-emerald-500 border-emerald-500" : "border-slate-600"
                      }`}>
                        {active && <span className="text-black text-[10px] font-bold">✓</span>}
                      </div>
                      <span className={`text-sm font-bold ${active ? "text-white" : "text-slate-400"}`}>
                        {end}
                      </span>
                    </div>
                    {active && <span className="text-[10px] text-emerald-400 font-mono tracking-wider">+SALARY</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: JURISDICTION */}
          <div className="mb-8">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Step 3: Jurisdiction
            </label>
            <select 
              value={userState}
              onChange={(e) => setUserState(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-sm focus:border-amber-500 focus:outline-none appearance-none"
            >
              <option value="TX">Texas (TX)</option>
              <option value="CA">California (CA)</option>
              <option value="FL">Florida (FL)</option>
              <option value="NY">New York (NY)</option>
              {/* Add more states later */}
            </select>
          </div>

          {/* CTA */}
          <button
            onClick={startDiagnostic}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-wider rounded-xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Initialize Diagnostic
          </button>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              NO ACCOUNT REQUIRED • 100% ANONYMOUS
            </p>
          </div>

        </motion.div>
      </div>
    </main>
  );
}
