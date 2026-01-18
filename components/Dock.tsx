"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { id: "dashboard", href: "/dashboard", label: "Station", icon: <GridIcon /> },
  { id: "sim", href: "/simulator", label: "Simulate", icon: <PulseIcon /> }, // We will build /simulator in Part 6
  { id: "study", href: "/study", label: "Manuals", icon: <BookIcon /> },
  { id: "profile", href: "/profile", label: "Logbook", icon: <UserIcon /> },
];

export default function Dock() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-[400px]">
      <div className="relative">
        
        {/* Amber Glow */}
        <div className="absolute -inset-1 rounded-3xl blur-xl opacity-20 bg-amber-600" />

        <nav className="relative flex items-center justify-between p-2 bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.id} 
                href={item.href} 
                className="relative flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all group"
              >
                {isActive && (
                  <motion.div
                    layoutId="dock-pill"
                    className="absolute inset-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <span className={`transition-colors duration-300 ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? "text-white" : "text-slate-600"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// --- Icons ---
function GridIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
function PulseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
}
function BookIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
}
function UserIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
