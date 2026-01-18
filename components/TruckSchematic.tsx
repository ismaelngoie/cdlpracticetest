"use client";

import { motion } from "framer-motion";

interface TruckSchematicProps {
  highlight?: string;
}

export default function TruckSchematic({ highlight = "" }: TruckSchematicProps) {
  // Normalize the highlight string to match keys easily
  const activeSystem = highlight.toLowerCase();

  const isBrakes = activeSystem.includes("brake");
  const isLights = activeSystem.includes("light") || activeSystem.includes("signal");
  const isEngine = activeSystem.includes("engine") || activeSystem.includes("general");
  const isCoupling = activeSystem.includes("coupling") || activeSystem.includes("trailer");

  // Animation variants for the "Problem Areas"
  const pulseVariant = {
    initial: { opacity: 0.3, fill: "transparent" },
    animate: { 
      opacity: [0.4, 1, 0.4], 
      fill: ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.3)", "rgba(239, 68, 68, 0)"],
      stroke: ["#ef4444", "#f87171", "#ef4444"],
      transition: { duration: 1.5, repeat: Infinity } 
    }
  };

  const normalVariant = {
    initial: { opacity: 0.5, stroke: "#475569" }, // slate-600
    animate: { opacity: 0.5, stroke: "#475569" }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg
        viewBox="0 0 600 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[220px]"
      >
        {/* --- CABIN (The Tractor) --- */}
        <motion.path
          d="M50,220 L50,100 L110,100 L140,60 L240,60 L240,220 Z"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={isEngine ? pulseVariant : normalVariant}
          initial="initial"
          animate="animate"
        />
        {/* Window */}
        <path d="M145,65 L235,65 L235,110 L145,110 Z" stroke="currentColor" className="text-slate-800" fill="rgba(255,255,255,0.05)" />

        {/* --- WHEELS (Tractor) --- */}
        <motion.circle 
          cx="90" cy="220" r="25" 
          strokeWidth="3"
          variants={isBrakes ? pulseVariant : normalVariant}
          initial="initial" animate="animate"
        />
        <motion.circle 
          cx="200" cy="220" r="25" 
          strokeWidth="3"
          variants={isBrakes ? pulseVariant : normalVariant}
          initial="initial" animate="animate"
        />

        {/* --- TRAILER --- */}
        <motion.path
          d="M260,220 L260,40 L550,40 L550,220 Z"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={isCoupling ? pulseVariant : normalVariant}
          initial="initial" animate="animate"
        />
        
        {/* --- WHEELS (Trailer) --- */}
        <motion.circle 
          cx="480" cy="220" r="25" 
          strokeWidth="3"
          variants={isBrakes ? pulseVariant : normalVariant}
          initial="initial" animate="animate"
        />
        <motion.circle 
          cx="530" cy="220" r="25" 
          strokeWidth="3"
          variants={isBrakes ? pulseVariant : normalVariant}
          initial="initial" animate="animate"
        />

        {/* --- COUPLING (Connection) --- */}
        <motion.rect 
            x="240" y="180" width="20" height="10" 
            variants={isCoupling ? pulseVariant : normalVariant}
            initial="initial" animate="animate"
        />

        {/* --- LIGHTS (Headlights & Marker Lights) --- */}
        {/* Headlight */}
        <motion.path 
            d="M240,160 L245,160" 
            strokeWidth="4" 
            strokeLinecap="round"
            className={isLights ? "text-amber-400 animate-pulse" : "text-slate-700"}
            stroke="currentColor"
        />
        {/* Beam (Only if lights active) */}
        {isLights && (
             <motion.path 
             d="M245,160 L300,130 L300,190 Z" 
             fill="url(#lightBeam)"
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.4 }}
             transition={{ yoyo: Infinity, duration: 0.8 }}
            />
        )}

        {/* --- DECORATIVE GRIDS --- */}
        <defs>
          <linearGradient id="lightBeam" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
             <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* --- LABELS (Only show if active) --- */}
        {isBrakes && (
             <text x="90" y="270" fill="#ef4444" fontSize="12" fontFamily="monospace" textAnchor="middle">BRAKE SYSTEM FAULT</text>
        )}
        {isEngine && (
             <text x="145" y="40" fill="#ef4444" fontSize="12" fontFamily="monospace">ENGINE DIAGNOSTICS</text>
        )}
      </svg>
    </div>
  );
}
