"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function TruckSchematic() {
  const [weakDomain, setWeakDomain] = useState("Air Brakes");
  const [activeZone, setActiveZone] = useState<"cab" | "engine" | "trailer">("engine");

  useEffect(() => {
    const wd = localStorage.getItem("weakestDomain") || "Air Brakes";
    setWeakDomain(wd);
    
    const lower = wd.toLowerCase();
    if (lower.includes("combination") || lower.includes("hazmat") || lower.includes("tanker") || lower.includes("cargo")) {
      setActiveZone("trailer");
    } else if (lower.includes("general") || lower.includes("passenger") || lower.includes("control")) {
      setActiveZone("cab");
    } else {
      setActiveZone("engine"); // Default for Air Brakes / Pre-Trip / Systems
    }
  }, []);

  // --- Visual Config ---
  const activeColor = "#F59E0B"; // Amber
  const inactiveColor = "#334155"; // Slate-700
  const dimColor = "#1e293b"; // Slate-800

  // Helper to determine style based on current active zone
  const getStyle = (zone: string) => {
    const isActive = activeZone === zone;
    return {
      stroke: isActive ? activeColor : inactiveColor,
      strokeWidth: isActive ? 2 : 1,
      fill: isActive ? "rgba(245, 158, 11, 0.1)" : "transparent",
      opacity: isActive ? 1 : 0.6,
      filter: isActive ? "url(#glow)" : "none"
    };
  };

  return (
    <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden bg-slate-950/30">
      
      {/* 1. Background Grid (CAD Style) */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(${dimColor} 1px, transparent 1px), linear-gradient(90deg, ${dimColor} 1px, transparent 1px)`, 
             backgroundSize: '40px 40px',
             opacity: 0.3
           }} 
      />

      {/* 2. Scanner Laser */}
      <motion.div
        animate={{ left: ["0%", "100%", "0%"] }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        className="absolute top-0 bottom-0 w-[2px] bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-20 pointer-events-none"
      />

      {/* 3. The Schematic SVG */}
      <svg width="340" height="180" viewBox="0 0 340 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="z-10">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- TRAILER GROUP --- */}
        <g id="trailer">
          {/* Cargo Box */}
          <motion.path
            d="M130 30 H 310 V 120 H 130 V 30 Z"
            {...getStyle("trailer")}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }}
          />
          {/* Ribbing (Detail) */}
          <path d="M160 30 V 120 M190 30 V 120 M220 30 V 120 M250 30 V 120 M280 30 V 120" stroke={activeZone === "trailer" ? activeColor : dimColor} strokeWidth="0.5" opacity="0.3" />
          
          {/* Landing Gear */}
          <path d="M150 120 L 150 135 M 160 120 L 160 135 L 150 135" stroke={activeZone === "trailer" ? activeColor : inactiveColor} strokeWidth="1" />
          
          {/* Rear Wheels (Tandem) */}
          <circle cx="260" cy="120" r="14" stroke={activeZone === "trailer" ? activeColor : inactiveColor} strokeWidth="2" fill="rgba(0,0,0,0.5)" />
          <circle cx="290" cy="120" r="14" stroke={activeZone === "trailer" ? activeColor : inactiveColor} strokeWidth="2" fill="rgba(0,0,0,0.5)" />
        </g>

        {/* --- ENGINE / CHASSIS GROUP --- */}
        <g id="engine">
          {/* Chassis Rail */}
          <motion.path
            d="M100 120 H 130 L 140 120 H 260"
            stroke={activeZone === "engine" ? activeColor : inactiveColor}
            strokeWidth="2"
          />
          {/* Kingpin Connection */}
          <path d="M110 110 L 130 110 L 130 120" stroke={activeZone === "engine" ? activeColor : inactiveColor} strokeWidth="1" />
          
          {/* Fuel Tank */}
          <rect x="70" y="125" width="40" height="15" rx="5" stroke={activeZone === "engine" ? activeColor : inactiveColor} strokeWidth="1" />
          
          {/* Drive Wheels (Rear of Tractor) */}
          <circle cx="95" cy="120" r="14" stroke={activeZone === "engine" ? activeColor : inactiveColor} strokeWidth="2" fill="rgba(0,0,0,0.5)" />
        </g>

        {/* --- CAB GROUP --- */}
        <g id="cab">
          {/* Main Cab Shape */}
          <motion.path
            d="M30 120 H 80 V 70 L 60 70 L 60 40 L 30 40 V 120 Z"
            {...getStyle("cab")}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }}
          />
          {/* Window */}
          <path d="M32 45 H 58 V 65 H 32 V 45 Z" stroke={activeZone === "cab" ? activeColor : dimColor} strokeWidth="1" fill="rgba(255,255,255,0.05)" />
          {/* Aerodynamic Fairing */}
          <path d="M30 40 L 20 50 V 110" stroke={activeZone === "cab" ? activeColor : inactiveColor} strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Steer Wheel (Front) */}
          <circle cx="45" cy="120" r="14" stroke={activeZone === "cab" ? activeColor : inactiveColor} strokeWidth="2" fill="rgba(0,0,0,0.5)" />
        </g>

        {/* --- DATA OVERLAYS (The "HUD" Feel) --- */}
        
        {/* Measurement Lines (Decor) */}
        <path d="M20 150 H 320" stroke={dimColor} strokeWidth="1" />
        <path d="M20 145 V 155 M 320 145 V 155" stroke={dimColor} strokeWidth="1" />
        <text x="170" y="165" textAnchor="middle" fill={dimColor} fontSize="8" fontFamily="monospace">O.A.L. 72' 0"</text>

        {/* Dynamic Pointer Line */}
        {activeZone === "cab" && <path d="M30 40 L 20 20 H 5" stroke={activeColor} strokeWidth="1" fill="none" />}
        {activeZone === "engine" && <path d="M70 132 L 60 150 H 10" stroke={activeColor} strokeWidth="1" fill="none" />}
        {activeZone === "trailer" && <path d="M220 30 L 220 10 H 330" stroke={activeColor} strokeWidth="1" fill="none" />}

      </svg>

      {/* 4. DYNAMIC LABELS (HTML Overlay) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Right Label */}
        {activeZone === "trailer" && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-2 right-2 text-right"
          >
            <div className="text-[9px] text-slate-500 font-mono">SYSTEM FAULT</div>
            <div className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
              CARGO / TRAILER
            </div>
          </motion.div>
        )}

        {/* Top Left Label */}
        {activeZone === "cab" && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-2 left-2"
          >
            <div className="text-[9px] text-slate-500 font-mono">SYSTEM FAULT</div>
            <div className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
              CAB / CONTROLS
            </div>
          </motion.div>
        )}

        {/* Bottom Left Label */}
        {activeZone === "engine" && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute bottom-2 left-2"
          >
            <div className="text-[9px] text-slate-500 font-mono">SYSTEM FAULT</div>
            <div className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
              BRAKES / CHASSIS
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
