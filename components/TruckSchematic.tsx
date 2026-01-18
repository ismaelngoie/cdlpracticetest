"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function TruckSchematic() {
  const [weakDomain, setWeakDomain] = useState("Air Brakes");
  
  // Logic: Map the weak domain to a part of the truck
  // Head = Cab (General Knowledge)
  // Engine = Pre-Trip / Air Brakes
  // Trailer = Combination / Hazmat
  const [activeZone, setActiveZone] = useState<"cab" | "engine" | "trailer">("engine");

  useEffect(() => {
    const wd = localStorage.getItem("weakestDomain") || "Air Brakes";
    setWeakDomain(wd);
    
    const lower = wd.toLowerCase();
    if (lower.includes("combination") || lower.includes("hazmat") || lower.includes("tanker")) {
      setActiveZone("trailer");
    } else if (lower.includes("general") || lower.includes("passenger")) {
      setActiveZone("cab");
    } else {
      setActiveZone("engine"); // Default for Air Brakes / Pre-Trip
    }
  }, []);

  const strokeColor = "#F59E0B"; // Amber-500
  const glowColor = "rgba(245, 158, 11, 0.5)";

  const isZone = (z: string) => activeZone === z;

  return (
    <div className="relative w-full h-[300px] flex items-center justify-center">
      
      {/* Scanner Effect */}
      <motion.div
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 6, ease: "linear", repeat: Infinity }}
        className="absolute left-0 right-0 h-[1px] bg-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.8)] z-20 pointer-events-none"
      />

      <svg width="300" height="150" viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
        
        {/* TRAILER (Rear) */}
        <motion.path
          d="M110 20 H 280 V 110 H 110 V 20 Z"
          stroke={isZone("trailer") ? strokeColor : "#334155"}
          strokeWidth={isZone("trailer") ? 3 : 1}
          fill={isZone("trailer") ? "rgba(245, 158, 11, 0.1)" : "transparent"}
          animate={isZone("trailer") ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Trailer Wheels */}
        <circle cx="230" cy="110" r="12" stroke="#334155" strokeWidth="2" />
        <circle cx="260" cy="110" r="12" stroke="#334155" strokeWidth="2" />

        {/* CAB (Front) */}
        <motion.path
          d="M20 110 H 90 V 60 L 70 60 L 70 30 L 20 30 V 110 Z"
          stroke={isZone("cab") ? strokeColor : "#334155"}
          strokeWidth={isZone("cab") ? 3 : 1}
          fill={isZone("cab") ? "rgba(245, 158, 11, 0.1)" : "transparent"}
          animate={isZone("cab") ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* ENGINE / CONNECTOR (Middle) */}
        <motion.path
          d="M90 110 H 110 V 80 H 90 V 110 Z"
          stroke={isZone("engine") ? strokeColor : "#334155"}
          strokeWidth={isZone("engine") ? 3 : 1}
          fill={isZone("engine") ? "rgba(245, 158, 11, 0.1)" : "transparent"}
          animate={isZone("engine") ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Tractor Wheels */}
        <circle cx="45" cy="110" r="12" stroke={isZone("engine") ? strokeColor : "#334155"} strokeWidth="2" />
        <circle cx="85" cy="110" r="12" stroke={isZone("engine") ? strokeColor : "#334155"} strokeWidth="2" />

      </svg>

      {/* HUD Label */}
      <div className="absolute bottom-4 right-4 text-right">
        <div className="text-[9px] text-slate-500 font-mono mb-1">SYSTEM ALERT</div>
        <div className="text-sm font-black text-amber-500 uppercase">{weakDomain}</div>
      </div>
    </div>
  );
}
