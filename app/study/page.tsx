// app/study/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Dock from "@/components/Dock";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { questions, type LicenseClass, type Endorsement } from "@/lib/questions";

// --- Industrial Icon Mapping ---
const ICONS: Record<string, string> = {
  "Air Brakes": "💨",
  "Combination Vehicles": "🔗",
  "Doubles/Triples": "🚛",
  "Driving Safely": "🛡️",
  "General Knowledge": "🧠",
  "Hazardous Materials": "☢️",
  Passenger: "👥",
  "Pre-Trip Inspection": "🔍",
  "School Bus": "🚸",
  "Tank Vehicles": "💧",
  "Transporting Cargo": "📦",
  "Vehicle Control": "⚙️",
  "Safety Systems": "🚨",
};

type Stats = { total: number; mastered: number; pct: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function getStateName(code: string) {
  const up = (code || "TX").toUpperCase();
  return STATE_NAMES[up] || up;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function computeWeakestDomain(
  license: LicenseClass,
  endorsements: Endorsement[],
  masteredIds: number[]
) {
  // Weakest = lowest mastery % among relevant categories with >= 5 questions
  const relevantQs = questions.filter((q) => {
    if (!q.licenseClasses.includes(license)) return false;
    if (q.endorsements && q.endorsements.length > 0) {
      return q.endorsements.some((e) => endorsements.includes(e));
    }
    return true;
  });

  const cats = Array.from(new Set(relevantQs.map((q) => q.category)));
  let weakest = { cat: "General Knowledge", pct: 101, total: 0 };

  for (const cat of cats) {
    const catQs = relevantQs.filter((q) => q.category === cat);
    const total = catQs.length;
    if (total < 5) continue;

    const mastered = catQs.filter((q) => masteredIds.includes(q.id)).length;
    const pct = total ? Math.round((mastered / total) * 100) : 0;

    if (pct < weakest.pct) weakest = { cat, pct, total };
  }

  const severity = clamp(100 - (weakest.pct === 101 ? 60 : weakest.pct), 15, 95);
  return { weakestDomain: weakest.cat, weakestSeverity: severity };
}

// ---- Tiny UI primitives ----
function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "amber" | "emerald" | "red" | "slate" | "blue";
}) {
  const cls =
    tone === "amber"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : tone === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : tone === "red"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : tone === "blue"
      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
      : "bg-white/5 border-white/10 text-slate-300";

  return (
    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = clamp(value, 0, 100);
  return (
    <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
      />
    </div>
  );
}

/**
 * ✅ FIX: Centering bug for PDF viewer modal.
 * We portal the modal to document.body so it’s not affected by any transformed parent / stacking contexts,
 * and we center using a fixed flex container (no translate math).
 */
function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.button
            aria-label="Close modal"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 md:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manuals Viewer</div>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 truncate">{title}</h3>
                  {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center text-slate-300 shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content area (keeps panel centered even if tall) */}
              <div className="p-5 md:p-6 overflow-auto max-h-[calc(92vh-92px)]">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

async function urlExists(url: string) {
  try {
    // HEAD is cheapest; some servers may block it -> fallback to GET
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    if (head.status === 405 || head.status === 403) {
      const get = await fetch(url, { method: "GET", cache: "no-store" });
      return get.ok;
    }
    return false;
  } catch {
    return false;
  }
}

function StateQuickSheet({ stateCode, onClose }: { stateCode: string; onClose: () => void }) {
  const code = (stateCode || "TX").toUpperCase();
  const name = getStateName(code);

  // You’ll place PDFs here:
  // public/manuals/states/TX.pdf, CA.pdf, ... and a fallback:
  // public/manuals/states/GENERIC.pdf
  const primary = `/manuals/states/${code}.pdf`;
  const fallback = `/manuals/states/GENERIC.pdf`;

  const [resolvedPdf, setResolvedPdf] = useState<string>(primary);
  const [status, setStatus] = useState<"checking" | "ok" | "fallback">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("checking");
      const ok = await urlExists(primary);
      if (!alive) return;
      if (ok) {
        setResolvedPdf(primary);
        setStatus("ok");
      } else {
        setResolvedPdf(fallback);
        setStatus("fallback");
      }
    })();
    return () => {
      alive = false;
    };
  }, [primary, fallback]);

  const bullets = useMemo(() => {
    return [
      `This is the ${name} (${code}) quick sheet used to mirror DMV-style wording and references.`,
      `Use it for: penalties & citations phrasing, inspection cues, and state-specific terminology that shows up on exams.`,
      `If anything here conflicts with an official manual, the official ${name} DMV manual wins.`,
    ];
  }, [name, code]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="blue">{code} DMV</Pill>
        <Pill tone="slate">PDF View</Pill>
        <Pill tone={status === "fallback" ? "amber" : "emerald"}>
          {status === "checking" ? "Checking…" : status === "fallback" ? "Fallback Pack" : "State Pack"}
        </Pill>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">What this is</div>
        <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-400">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={resolvedPdf}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            Open in New Tab
          </a>
          <a
            href={resolvedPdf}
            download
            className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>

        {status === "fallback" && (
          <div className="mt-3 text-[11px] text-amber-300/80">
            State PDF not found at <span className="font-mono text-amber-200">{primary}</span>. Showing fallback pack instead.
            (Add a file at that path to enable true state-specific packs.)
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preview</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{resolvedPdf}</div>
        </div>

        {/* PDF Preview */}
        <div className="h-[62vh] bg-black">
          <iframe title={`${code} quick sheet`} src={resolvedPdf} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

function ModuleManualViewer({ category, onClose }: { category: string; onClose: () => void }) {
  // Optional: per-module PDFs
  // public/manuals/modules/<slug>.pdf and a fallback GENERIC-MODULE.pdf
  const slug = slugify(category);
  const primary = `/manuals/modules/${slug}.pdf`;
  const fallback = `/manuals/modules/GENERIC-MODULE.pdf`;

  const [resolvedPdf, setResolvedPdf] = useState<string>(primary);
  const [status, setStatus] = useState<"checking" | "ok" | "fallback">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("checking");
      const ok = await urlExists(primary);
      if (!alive) return;
      if (ok) {
        setResolvedPdf(primary);
        setStatus("ok");
      } else {
        setResolvedPdf(fallback);
        setStatus("fallback");
      }
    })();
    return () => {
      alive = false;
    };
  }, [primary, fallback]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="slate">Module</Pill>
        <Pill tone="blue">{category}</Pill>
        <Pill tone={status === "fallback" ? "amber" : "emerald"}>
          {status === "checking" ? "Checking…" : status === "fallback" ? "Fallback Manual" : "Manual Found"}
        </Pill>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">How to use</div>
        <div className="text-sm text-slate-300 leading-relaxed">
          Use this PDF as a reference companion while drilling questions. If you don’t have a module PDF yet, the fallback manual is shown—drop your PDF at{" "}
          <span className="font-mono text-slate-200">{primary}</span>.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={resolvedPdf}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            Open in New Tab
          </a>
          <a
            href={resolvedPdf}
            download
            className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preview</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{resolvedPdf}</div>
        </div>
        <div className="h-[62vh] bg-black">
          <iframe title={`${category} manual`} src={resolvedPdf} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  const [license, setLicense] = useState<LicenseClass>("A");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [userState, setUserState] = useState("TX");
  const [masteredIds, setMasteredIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [focusOnly, setFocusOnly] = useState(false);

  const [statePdfOpen, setStatePdfOpen] = useState(false);
  const [modulePdfOpen, setModulePdfOpen] = useState(false);
  const [activeModuleForPdf, setActiveModuleForPdf] = useState<string>("");

  useEffect(() => {
    setLicense((localStorage.getItem("userLevel") as LicenseClass) || "A");

    const endRaw = localStorage.getItem("userEndorsements");
    const e = safeJson<Endorsement[]>(endRaw, []);
    setEndorsements(Array.isArray(e) ? e : []);

    setUserState((localStorage.getItem("userState") || "TX").toUpperCase());

    const m = safeJson<number[]>(localStorage.getItem("mastered-ids"), []);
    setMasteredIds(Array.isArray(m) ? m : []);
  }, []);

  // keep weakest domain + severity in sync (used elsewhere in app)
  useEffect(() => {
    const { weakestDomain, weakestSeverity } = computeWeakestDomain(license, endorsements, masteredIds);
    localStorage.setItem("weakestDomain", weakestDomain);
    localStorage.setItem("weakestSeverity", String(weakestSeverity));
  }, [license, endorsements, masteredIds]);

  const relevantQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.licenseClasses.includes(license)) return false;
      if (q.endorsements && q.endorsements.length > 0) {
        return q.endorsements.some((e) => endorsements.includes(e));
      }
      return true;
    });
  }, [license, endorsements]);

  const categories = useMemo(() => {
    return Array.from(new Set(relevantQuestions.map((q) => q.category))).sort();
  }, [relevantQuestions]);

  const statsByCat = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const cat of categories) {
      const catQs = relevantQuestions.filter((q) => q.category === cat);
      const total = catQs.length;
      const mastered = catQs.filter((q) => masteredIds.includes(q.id)).length;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      map.set(cat, { total, mastered, pct });
    }
    return map;
  }, [categories, relevantQuestions, masteredIds]);

  const { weakestDomain, weakestSeverity } = useMemo(
    () => computeWeakestDomain(license, endorsements, masteredIds),
    [license, endorsements, masteredIds]
  );

  const filteredCats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((cat) => {
      const st = statsByCat.get(cat);
      if (!st) return false;

      const matchesQuery =
        !q ||
        cat.toLowerCase().includes(q) ||
        (ICONS[cat] || "").toLowerCase().includes(q) ||
        (st.pct + "%").includes(q);

      const focusGate = !focusOnly || st.pct < 80;
      return matchesQuery && focusGate;
    });
  }, [categories, query, focusOnly, statsByCat]);

  const overall = useMemo(() => {
    const total = relevantQuestions.length;
    const mastered = relevantQuestions.filter((q) => masteredIds.includes(q.id)).length;
    const pct = total ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, pct };
  }, [relevantQuestions, masteredIds]);

  const openModulePdf = useCallback((cat: string) => {
    setActiveModuleForPdf(cat);
    setModulePdfOpen(true);
  }, []);

  const stateName = useMemo(() => getStateName(userState), [userState]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* State PDF modal */}
      <Modal
        open={statePdfOpen}
        title={`${stateName} (${userState}) — Jurisdiction Quick Sheet`}
        subtitle="State-linked PDF pack (with automatic fallback if missing)."
        onClose={() => setStatePdfOpen(false)}
      >
        <StateQuickSheet stateCode={userState} onClose={() => setStatePdfOpen(false)} />
      </Modal>

      {/* Module PDF modal */}
      <Modal
        open={modulePdfOpen}
        title={`${activeModuleForPdf || "Module"} — Manual PDF`}
        subtitle="Per-module reference PDF (optional)."
        onClose={() => setModulePdfOpen(false)}
      >
        <ModuleManualViewer
          category={activeModuleForPdf || "General Knowledge"}
          onClose={() => setModulePdfOpen(false)}
        />
      </Modal>

      {/* Header */}
      <header className="px-6 pt-10 pb-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Training Console
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Technical Manuals</h1>
            <p className="text-sm text-slate-400 font-mono">
              RIG CONFIGURATION:{" "}
              <span className="text-amber-500">CLASS {license}</span>{" "}
              <span className="text-slate-600">•</span>{" "}
              <span className="text-slate-400">
                {userState} DMV ({stateName})
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="slate">Manuals</Pill>
              <Pill tone="slate">Study Mode</Pill>
              <Pill tone="amber">PDF Viewer</Pill>
            </div>
          </div>

          {/* Overall progress badge */}
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Mastery</div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <div className="w-28">
                <ProgressBar value={overall.pct} />
              </div>
              <div className="text-sm font-mono font-black text-amber-400">{overall.pct}%</div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {overall.mastered}/{overall.total} mastered
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search manuals (e.g., Air Brakes, Hazmat, Pre-Trip)…"
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <button
            onClick={() => setFocusOnly((p) => !p)}
            className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
              focusOnly
                ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {focusOnly ? "Focus Mode: ON" : "Focus Mode"}
          </button>
        </div>
      </header>

      <main className="px-4 max-w-3xl mx-auto space-y-4">
        {/* High-value “Focus Target” panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.16),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Recommended Focus
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{ICONS[weakestDomain] || "📍"}</div>
                <div>
                  <div className="font-black text-white text-lg leading-tight">{weakestDomain}</div>
                  <div className="text-sm text-slate-400">Highest impact module right now.</div>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Severity</div>
              <div className="mt-1 flex items-center gap-2 sm:justify-end">
                <div className="w-28">
                  <ProgressBar value={weakestSeverity} />
                </div>
                <div className="text-sm font-mono font-black text-amber-400">{weakestSeverity}%</div>
              </div>

              <Link
                href={`/station?mode=study&category=${encodeURIComponent(weakestDomain)}`}
                className="inline-block mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors"
              >
                Start Focus Module →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* “Jurisdiction Data” panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
              JURISDICTION DATA
            </div>
            <div className="font-bold text-white text-sm truncate">{userState} DMV Quick Sheet</div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">
              PDF quick-reference pack that mirrors state exam phrasing.
            </div>
          </div>

          <button
            onClick={() => setStatePdfOpen(true)}
            className="shrink-0 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30"
          >
            VIEW PDF
          </button>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {filteredCats.map((cat) => {
              const st = statsByCat.get(cat)!;

              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    href={`/station?mode=study&category=${encodeURIComponent(cat)}`}
                    className="group relative block overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-amber-500/50 transition-all"
                  >
                    {/* Progress wash */}
                    <div className="absolute inset-y-0 left-0 bg-slate-800/50" style={{ width: `${st.pct}%` }} />
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                          {ICONS[cat] || "📂"}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-slate-200 group-hover:text-white truncate">{cat}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <div className="text-[10px] font-mono text-slate-500">
                              MASTERY: <span className="text-slate-300">{st.pct}%</span>{" "}
                              <span className="text-slate-600">({st.mastered}/{st.total})</span>
                            </div>

                            {st.pct >= 80 ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-400">
                                Improve
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {/* Manual button (does not navigate) */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModulePdf(cat);
                          }}
                          className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors"
                          title="Open module manual PDF"
                        >
                          Manual PDF
                        </button>

                        {/* micro “ring” */}
                        <div className="relative w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                          <div className="text-[10px] font-mono text-slate-400">{st.pct}</div>
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                              boxShadow:
                                st.pct < 80
                                  ? "0 0 0 0 rgba(245,158,11,0)"
                                  : "0 0 0 0 rgba(16,185,129,0)",
                            }}
                            animate={
                              st.pct < 80
                                ? {
                                    boxShadow: [
                                      "0 0 0 0 rgba(245,158,11,0)",
                                      "0 0 18px 2px rgba(245,158,11,0.22)",
                                      "0 0 0 0 rgba(245,158,11,0)",
                                    ],
                                  }
                                : {
                                    boxShadow: [
                                      "0 0 0 0 rgba(16,185,129,0)",
                                      "0 0 18px 2px rgba(16,185,129,0.18)",
                                      "0 0 0 0 rgba(16,185,129,0)",
                                    ],
                                  }
                            }
                            transition={{ duration: 2.2, repeat: Infinity }}
                          />
                        </div>

                        <div className="w-10 h-10 rounded-2xl border border-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-slate-950 transition-colors text-slate-500">
                          →
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredCats.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="text-slate-300 font-black">No manuals match that filter.</div>
              <div className="text-sm text-slate-500 mt-1">Try a different keyword or turn off Focus Mode.</div>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="pt-2 text-center">
          <Link
            href="/dashboard"
            className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors"
          >
            Return to Command Center
          </Link>
        </div>
      </main>

      <Dock />
    </div>
  );
}
