"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Zone = "cab" | "engine" | "trailer";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeZone(wd: string): Zone {
  const lower = (wd || "").toLowerCase();

  if (lower.includes("combination") || lower.includes("hazmat") || lower.includes("tanker") || lower.includes("trailer")) {
    return "trailer";
  }
  if (lower.includes("general") || lower.includes("passenger") || lower.includes("cab")) {
    return "cab";
  }
  return "engine"; // Air Brakes / Pre-Trip / default
}

function zoneMeta(z: Zone) {
  if (z === "cab") return { title: "CAB SYSTEMS", subtitle: "General knowledge, passenger, controls" };
  if (z === "trailer") return { title: "TRAILER MODULES", subtitle: "Combination, hazmat, tanker" };
  return { title: "ENGINE / AIR", subtitle: "Pre-trip, air brakes, powertrain" };
}

export default function TruckSchematic() {
  const [weakDomain, setWeakDomain] = useState("Air Brakes");
  const [activeZone, setActiveZone] = useState<Zone>("engine");
  const [signal, setSignal] = useState(78); // “severity” 0–100 for UI feel

  useEffect(() => {
    const wd = localStorage.getItem("weakestDomain") || "Air Brakes";
    setWeakDomain(wd);
    setActiveZone(computeZone(wd));

    const sev = Number(localStorage.getItem("weakestSeverity") || "");
    if (!Number.isNaN(sev) && sev > 0) setSignal(clamp(Math.round(sev), 1, 100));
  }, []);

  const meta = useMemo(() => zoneMeta(activeZone), [activeZone]);

  const strokeHot = "#F59E0B"; // amber-500
  const strokeCool = "#334155"; // slate-700
  const glow = "rgba(245, 158, 11, 0.45)";

  const isZone = (z: Zone) => activeZone === z;

  return (
    <div className="relative w-full h-[340px] flex items-center justify-center">
      {/* HUD backdrop */}
      <div className="absolute inset-0 rounded-3xl border border-slate-800 bg-slate-950/60 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:26px_26px]" />
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{
            background:
              "radial-gradient(800px circle at 20% 10%, rgba(245,158,11,0.12), transparent 60%)",
          }}
        />
      </div>

      {/* Scanner line */}
      <motion.div
        animate={{ top: ["8%", "88%", "8%"] }}
        transition={{ duration: 6.2, ease: "linear", repeat: Infinity }}
        className="absolute left-4 right-4 h-[2px] rounded-full bg-amber-500/35 shadow-[0_0_18px_rgba(245,158,11,0.75)] z-20 pointer-events-none"
      />

      {/* Top HUD bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Diagnostic Overlay</div>
          <div className="text-white font-black tracking-wide truncate">{meta.title}</div>
          <div className="text-[11px] text-slate-400 truncate">{meta.subtitle}</div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Signal</div>
          <div className="flex items-center justify-end gap-2">
            <div className="w-28">
              <div className="h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${signal}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                />
              </div>
            </div>
            <div className="text-sm font-mono font-black text-amber-400">{signal}%</div>
          </div>
        </div>
      </div>

      {/* Main SVG */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <svg
          width="420"
          height="190"
          viewBox="0 0 420 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="hotFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.05)" />
            </linearGradient>

            <linearGradient id="coolFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(148,163,184,0.08)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.02)" />
            </linearGradient>
          </defs>

          {/* subtle chassis line */}
          <path d="M60 148 H 370" stroke="rgba(148,163,184,0.22)" strokeWidth="2" strokeDasharray="6 8" />

          {/* TRAILER */}
          <motion.g
            animate={isZone("trailer") ? { opacity: [0.75, 1, 0.75] } : { opacity: 1 }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <path
              d="M170 40 H 386 V 140 H 170 V 40 Z"
              stroke={isZone("trailer") ? strokeHot : strokeCool}
              strokeWidth={isZone("trailer") ? 3 : 1.5}
              fill={isZone("trailer") ? "url(#hotFill)" : "url(#coolFill)"}
              filter={isZone("trailer") ? "url(#glow)" : undefined}
            />
            {/* door lines */}
            <path d="M350 50 V 130" stroke="rgba(148,163,184,0.22)" strokeWidth="2" />
            <path d="M330 50 V 130" stroke="rgba(148,163,184,0.12)" strokeWidth="2" />

            {/* Trailer wheels */}
            <circle cx="312" cy="140" r="14" stroke={strokeCool} strokeWidth="2.5" />
            <circle cx="352" cy="140" r="14" stroke={strokeCool} strokeWidth="2.5" />
            <circle cx="312" cy="140" r="6" stroke="rgba(148,163,184,0.45)" strokeWidth="2" />
            <circle cx="352" cy="140" r="6" stroke="rgba(148,163,184,0.45)" strokeWidth="2" />
          </motion.g>

          {/* CAB */}
          <motion.g
            animate={isZone("cab") ? { opacity: [0.75, 1, 0.75] } : { opacity: 1 }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <path
              d="M34 140 H 132 V 86 L 104 86 L 104 48 L 34 48 V 140 Z"
              stroke={isZone("cab") ? strokeHot : strokeCool}
              strokeWidth={isZone("cab") ? 3 : 1.5}
              fill={isZone("cab") ? "url(#hotFill)" : "url(#coolFill)"}
              filter={isZone("cab") ? "url(#glow)" : undefined}
            />
            {/* window */}
            <path
              d="M46 60 H 92 V 86 H 46 V 60 Z"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="2"
              fill="rgba(2,6,23,0.35)"
            />
          </motion.g>

          {/* ENGINE / CONNECTOR */}
          <motion.g
            animate={isZone("engine") ? { opacity: [0.75, 1, 0.75] } : { opacity: 1 }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <path
              d="M132 140 H 170 V 104 H 132 V 140 Z"
              stroke={isZone("engine") ? strokeHot : strokeCool}
              strokeWidth={isZone("engine") ? 3 : 1.5}
              fill={isZone("engine") ? "url(#hotFill)" : "url(#coolFill)"}
              filter={isZone("engine") ? "url(#glow)" : undefined}
            />

            {/* “air lines” */}
            <motion.path
              d="M144 116 C 150 110, 160 110, 166 116"
              stroke={isZone("engine") ? strokeHot : "rgba(148,163,184,0.35)"}
              strokeWidth="2"
              strokeLinecap="round"
              animate={isZone("engine") ? { pathLength: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          </motion.g>

          {/* Tractor wheels */}
          <circle
            cx="66"
            cy="140"
            r="14"
            stroke={isZone("engine") ? strokeHot : strokeCool}
            strokeWidth="2.5"
            filter={isZone("engine") ? "url(#glow)" : undefined}
          />
          <circle
            cx="118"
            cy="140"
            r="14"
            stroke={isZone("engine") ? strokeHot : strokeCool}
            strokeWidth="2.5"
            filter={isZone("engine") ? "url(#glow)" : undefined}
          />
          <circle cx="66" cy="140" r="6" stroke="rgba(148,163,184,0.45)" strokeWidth="2" />
          <circle cx="118" cy="140" r="6" stroke="rgba(148,163,184,0.45)" strokeWidth="2" />

          {/* Zone callouts */}
          <AnimatePresence>
            {isZone("cab") && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <path d="M96 54 L 160 24" stroke={strokeHot} strokeWidth="2" />
                <circle cx="160" cy="24" r="4" fill={strokeHot} />
                <text x="168" y="28" fill="rgba(245,158,11,0.95)" fontSize="10" fontFamily="monospace">
                  CAB
                </text>
              </motion.g>
            )}

            {isZone("engine") && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <path d="M154 100 L 200 18" stroke={strokeHot} strokeWidth="2" />
                <circle cx="200" cy="18" r="4" fill={strokeHot} />
                <text x="208" y="22" fill="rgba(245,158,11,0.95)" fontSize="10" fontFamily="monospace">
                  ENGINE / AIR
                </text>
              </motion.g>
            )}

            {isZone("trailer") && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <path d="M330 44 L 340 16" stroke={strokeHot} strokeWidth="2" />
                <circle cx="340" cy="16" r="4" fill={strokeHot} />
                <text x="348" y="20" fill="rgba(245,158,11,0.95)" fontSize="10" fontFamily="monospace">
                  TRAILER
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Alert</div>
          <div className="text-base font-black text-amber-400 uppercase truncate">{weakDomain}</div>
          <div className="text-[11px] text-slate-400 truncate">
            Focus this module to raise your score and stabilize the zone.
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zone</div>
          <div className="text-sm font-mono font-black text-white">{activeZone.toUpperCase()}</div>
          <div className="text-[11px] font-mono text-slate-500">DIAG: {Math.floor(100000 + Math.random() * 900000)}</div>
        </div>
      </div>

      {/* Corner brackets */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-slate-700" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-slate-700" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-slate-700" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-slate-700" />
      </div>
    </div>
  );
}
