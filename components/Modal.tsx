"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

type Tone = "amber" | "emerald" | "red";

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  tone = "amber",
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  tone?: Tone;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ring =
    tone === "emerald"
      ? "ring-emerald-500/20"
      : tone === "red"
      ? "ring-red-500/20"
      : "ring-amber-500/20";

  const titleColor =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-red-300"
      : "text-amber-300";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop: High transparency (bg-slate-950/40) + Blur.
             This ensures they see the app behind it, reducing "checkout anxiety".
          */}
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-all"
          />

          {/* Panel: "Million Dollar" look - sharp borders, deep shadows, premium feel */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className={`relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 shadow-2xl p-6 ring-1 ${ring}`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className={`text-xl font-black tracking-tight ${titleColor}`}>
                  {title}
                </div>
                {subtitle ? (
                  <div className="text-sm text-slate-400 mt-1 font-medium">
                    {subtitle}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-2">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
