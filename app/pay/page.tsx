"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// --- CONFIGURATION ---
type PlanKey = "monthly" | "lifetime";

const STRIPE_LINKS: Record<PlanKey, string> = {
  // ⚠️ REPLACE THESE WITH YOUR NEW STRIPE PAYMENT LINKS
  monthly: "https://buy.stripe.com/test_monthly", 
  lifetime: "https://buy.stripe.com/test_lifetime",
};

const PRICING = {
  monthly: {
    price: 19.95,
    cadence: "/mo",
    title: "Haul Pass",
    subtitle: "Cancel anytime. Good for quick refreshers.",
    features: ["Full Simulator Access", "Smart Fix Plan"],
  },
  lifetime: {
    price: 69.00,
    cadence: " one-time",
    title: "Pass Guarantee",
    subtitle: "Get your CDL or money back. Own it forever.",
    badge: "BEST VALUE",
    features: ["Everything in Monthly", "Lifetime Updates", "100% Money-Back Guarantee"],
  },
};

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lifetime");
  
  // Personalization State
  const [score, setScore] = useState(0);
  const [weakDomain, setWeakDomain] = useState("General Knowledge");
  const [userState, setUserState] = useState("TX");

  // Restore State
  const [restoreEmail, setRestoreEmail] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");

  useEffect(() => {
    // Load data from the Diagnostic phase
    const s = parseInt(localStorage.getItem("diagnosticScore") || "42");
    setScore(s);
    setWeakDomain(localStorage.getItem("weakestDomain") || "General Knowledge");
    setUserState(localStorage.getItem("userState") || "TX");
  }, []);

  const checkoutUrl = STRIPE_LINKS[selectedPlan];

  const handleRestore = async () => {
    if (!restoreEmail.includes("@")) {
      setRestoreMsg("Please enter a valid email.");
      return;
    }
    setIsRestoring(true);
    // Simulate API call for now (We will build the real API in Part 5)
    setTimeout(() => {
      setRestoreMsg("We couldn't find that email. If you just purchased, check your inbox for the access link.");
      setIsRestoring(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-32">
      
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.15),transparent_70%)]" />

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-10">
        
        {/* The "Hook": Agitate the Failure */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest mb-4">
            ⚠️ Diagnostic Result: Grounded
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-4">
            Your Roadmap is <span className="text-amber-500">Incomplete.</span>
          </h1>
          
          <p className="text-slate-400 text-sm leading-relaxed">
            Based on your answers, you are currently <span className="text-white font-bold">Risk Level High</span> in <span className="text-white font-bold">{weakDomain}</span>. You need a passing score of 80% to clear the {userState} DMV exam.
          </p>
        </motion.div>

        {/* The "Solution": Pricing Cards */}
        <div className="space-y-4 mb-8">
          
          {/* OPTION 1: LIFETIME (WINNER) */}
          <button
            onClick={() => setSelectedPlan("lifetime")}
            className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all group ${
              selectedPlan === "lifetime"
                ? "bg-amber-500/10 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            {selectedPlan === "lifetime" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">
                Recommended for New Drivers
              </div>
            )}
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className={`text-lg font-black ${selectedPlan === "lifetime" ? "text-white" : "text-slate-300"}`}>
                  {PRICING.lifetime.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  {PRICING.lifetime.subtitle}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">${PRICING.lifetime.price}</span>
                <span className="text-xs text-slate-500 block">one-time</span>
              </div>
            </div>

            {selectedPlan === "lifetime" && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                {PRICING.lifetime.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="text-emerald-500 font-bold">✓</span> {feat}
                  </div>
                ))}
              </div>
            )}
          </button>

          {/* OPTION 2: MONTHLY */}
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all ${
              selectedPlan === "monthly"
                ? "bg-slate-800 border-slate-500"
                : "bg-slate-900 border-slate-800 opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold text-slate-200">{PRICING.monthly.title}</h3>
                <p className="text-xs text-slate-500">{PRICING.monthly.subtitle}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-300">${PRICING.monthly.price}</span>
                <span className="text-xs text-slate-500 block">/mo</span>
              </div>
            </div>
          </button>

        </div>

        {/* Secure Checkout Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-white/5 z-50">
          <div className="max-w-lg mx-auto">
            <a 
              href={checkoutUrl}
              className="block w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-lg text-center uppercase tracking-widest shadow-lg transition-transform active:scale-95"
            >
              Unlock My Plan
            </a>
            <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-2">
              <span>🔒 SECURE CHECKOUT</span> • <span>INSTANT ACCESS</span>
            </p>
          </div>
        </div>

        {/* Restore Purchase Area */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Already have a license?
          </h4>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Enter your email"
              value={restoreEmail}
              onChange={(e) => setRestoreEmail(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
            />
            <button 
              onClick={handleRestore}
              disabled={isRestoring}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white border border-slate-700"
            >
              {isRestoring ? "..." : "Restore"}
            </button>
          </div>
          {restoreMsg && (
            <p className="text-xs text-amber-500 mt-2">{restoreMsg}</p>
          )}
        </div>

      </main>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PaywallContent />
    </Suspense>
  );
}
