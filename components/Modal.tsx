// components/Modal.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

function getFocusable(container: HTMLElement | null) {
  if (!container) return [];
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
  return nodes;
}

export default function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  tone = "default",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  tone?: "default" | "amber";
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const headerGlow = useMemo(() => {
    if (tone === "amber") return "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_55%)]";
    return "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_55%)]";
  }, [tone]);

  // Scroll lock + remember focus
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap + Esc close
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const focusables = getFocusable(panel);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Focus first control (native-feel)
    setTimeout(() => {
      first?.focus?.();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;
      if (!focusables.length) return;

      // Trap tab
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus?.();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus?.();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Return focus to previous element when closing
  useEffect(() => {
    if (open) return;
    const prev = previouslyFocusedRef.current;
    if (prev) setTimeout(() => prev.focus?.(), 0);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.button
            aria-label="Close modal"
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Center */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg"
              initial={{ y: 14, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 14, scale: 0.985 }}
              transition={{ duration: 0.18 }}
            >
              <div ref={panelRef} className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-24 opacity-60 pointer-events-none ${headerGlow}`} />
                <div className="relative p-5 border-b border-slate-800 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Flow</div>
                    <h3 className="text-xl font-black text-white mt-1 truncate">{title}</h3>
                    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center text-slate-300 shrink-0"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5">{children}</div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
