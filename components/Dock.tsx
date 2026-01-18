"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "dashboard", href: "/dashboard", label: "Station", icon: <GridIcon /> },
  { id: "sim", href: "/simulator", label: "Simulate", icon: <PulseIcon /> },
  { id: "study", href: "/study", label: "Manuals", icon: <BookIcon /> },
  { id: "profile", href: "/profile", label: "Logbook", icon: <UserIcon /> },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  // handle nested routes like /study/station
  return pathname.startsWith(href + "/");
}

function safePct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function Dock() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Tiny “live” telemetry you can optionally drive from localStorage.
  // If you don't store these, the dock still looks premium.
  const [simProgress, setSimProgress] = useState<number>(0); // % answered in active session
  const [unreadFlags, setUnreadFlags] = useState<number>(0); // flagged questions count

  useEffect(() => {
    setMounted(true);

    const readTelemetry = () => {
      try {
        const raw = localStorage.getItem("haul-active-session");
        if (!raw) {
          setSimProgress(0);
          setUnreadFlags(0);
          return;
        }
        const s = JSON.parse(raw) as {
          answers?: Record<string, number>;
          flags?: number[];
          questionIds?: number[];
        };

        const total = Array.isArray(s.questionIds) ? s.questionIds.length : 0;
        const answered = s.answers ? Object.keys(s.answers).length : 0;
        const pct = total ? (answered / total) * 100 : 0;

        setSimProgress(safePct(pct));
        setUnreadFlags(Array.isArray(s.flags) ? s.flags.length : 0);
      } catch {
        setSimProgress(0);
        setUnreadFlags(0);
      }
    };

    readTelemetry();
    const t = setInterval(readTelemetry, 1200);
    return () => clearInterval(t);
  }, []);

  const activeIdx = useMemo(() => {
    const idx = navItems.findIndex((x) => isRouteActive(pathname, x.href));
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-[430px]">
      <div className="relative">
        {/* Ambient glow + glass */}
        <div className="absolute -inset-2 rounded-[28px] blur-2xl opacity-25 bg-amber-600" />
        <div className="absolute -inset-1 rounded-[26px] blur-xl opacity-20 bg-sky-500" />

        {/* Outer frame */}
        <div className="relative rounded-[28px] p-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 shadow-2xl">
          <nav className="relative flex items-center justify-between gap-1.5 p-2 bg-slate-950/85 backdrop-blur-2xl border border-slate-800/80 rounded-[27px]">
            {/* Active rail (subtle) */}
            <div className="absolute inset-x-3 top-2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {navItems.map((item, i) => {
              const isActive = isRouteActive(pathname, item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-label={item.label}
                  className="relative flex-1 min-w-0"
                >
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className="relative flex flex-col items-center justify-center py-3 rounded-2xl transition-colors"
                  >
                    {/* Active pill */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="dock-pill"
                          className="absolute inset-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_18px_rgba(245,158,11,0.22)]"
                          transition={{ type: "spring", bounce: 0.22, duration: 0.6 }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Hover sheen */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-white/5 to-transparent" />

                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <span
                        className={`transition-colors duration-300 ${
                          isActive ? "text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span
                        className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Micro indicators */}
                    {mounted && item.id === "sim" && simProgress > 0 && (
                      <div className="absolute -top-1.5 right-2 z-20">
                        <div className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[9px] font-black text-amber-300">
                          {simProgress}%
                        </div>
                      </div>
                    )}

                    {mounted && item.id === "sim" && unreadFlags > 0 && (
                      <div className="absolute -top-1.5 left-2 z-20">
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-[0_0_14px_rgba(245,158,11,0.35)]">
                          {unreadFlags > 9 ? "9+" : unreadFlags}
                        </div>
                      </div>
                    )}

                    {/* Bottom progress rail under active icon */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "56%", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute -bottom-1 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Keyboard focus ring */}
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}

            {/* Active index “notch” (tiny, premium detail) */}
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-2 pointer-events-none"
              initial={false}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="absolute bottom-0 h-2 w-10 left-0 rounded-b-[14px] bg-slate-950/85 border-x border-b border-slate-800/80"
                style={{
                  // align under active item
                  left: `calc(${(activeIdx / (navItems.length - 1)) * 100}% - 20px)`,
                }}
                transition={{ type: "spring", stiffness: 160, damping: 18 }}
              />
            </motion.div>
          </nav>
        </div>
      </div>
    </div>
  );
}

// --- Icons ---
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function PulseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
