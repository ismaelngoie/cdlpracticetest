// app/study/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function computeWeakestDomain(license: LicenseClass, endorsements: Endorsement[], masteredIds: number[]) {
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
  children: React.ReactNode;
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

// Centered, scroll-safe, production modal
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
  children: React.ReactNode;
  onClose: () => void;
}) {
  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close modal"
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-4xl"
              initial={{ y: 12, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.985 }}
              transition={{ duration: 0.18 }}
            >
              <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
                <div className="p-5 md:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manuals Console</div>
                    <h3 className="text-xl md:text-2xl font-black text-white mt-1 truncate">{title}</h3>
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
                <div className="p-5 md:p-6 overflow-auto">{children}</div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm">{icon || "📘"}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{title}</div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Quick Sheet</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
      {items.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-amber-400">•</span>
          <span className="min-w-0">{b}</span>
        </li>
      ))}
    </ul>
  );
}

function StateQuickSheet({
  stateCode,
  license,
  endorsements,
}: {
  stateCode: string;
  license: LicenseClass;
  endorsements: Endorsement[];
}) {
  const code = (stateCode || "TX").toUpperCase();
  const name = getStateName(code);

  const headline = useMemo(() => {
    const end = endorsements.length ? ` + ${endorsements.join(", ")}` : "";
    return `${name} (${code}) — CDL Quick Sheet • Class ${license}${end}`;
  }, [name, code, license, endorsements]);

  const keyFacts = useMemo(() => {
    return [
      "Your state CDL program follows federal FMCSA baseline rules; test wording and admin steps can vary by state.",
      "Treat this sheet as a high-yield memory aid for common exam phrasing: safety systems, inspection logic, and rule structure.",
      "If your state handbook uses a different term or emphasis, follow the official wording (the test mirrors the handbook).",
    ];
  }, []);

  const compliance = useMemo(() => {
    return [
      "Alcohol & drugs: operating a CMV after consuming alcohol is prohibited; CDL penalties can be severe under federal baseline rules.",
      "Medical qualification: keep your medical certificate current if required for your type of driving (interstate/intrastate rules may differ).",
      "Hours-of-Service: most CDL exams expect the structure of daily driving/on-duty limits and the idea of mandatory off-duty time.",
      "Cell phone & distracted driving: handheld use while driving a CMV is a high-risk violation topic in manuals and test questions.",
    ];
  }, []);

  const safety = useMemo(() => {
    return [
      "Space management: expect questions on following distance, managing speed, and hazard recognition (rain, fog, night driving).",
      "Railroad crossings: stop/scan/listen rules and “no shifting on tracks” is a common test theme.",
      "Work zones: reduce speed early, keep lane discipline, and never tailgate in construction areas.",
      "Emergency equipment: triangles/flares placement logic is commonly tested (scene safety first, warn traffic, call for help).",
    ];
  }, []);

  const inspection = useMemo(() => {
    return [
      "Pre-trip mindset: start broad (leaks/lean/tilt), then tires/wheels/brakes, then lights/reflectors, then coupling/cargo, then in-cab safety.",
      "Brakes: for air brakes, know the purpose of the governor, warning devices, and why air leaks matter under pressure.",
      "Steering & suspension: “not bent, cracked, or broken” language is everywhere—expect it in both questions and explanations.",
      "Cargo securement: test writers love the concept of checking load early and often, especially after the first miles and after breaks.",
    ];
  }, []);

  const examTactics = useMemo(() => {
    return [
      "Look for absolute words (always/never) unless the rule truly is absolute; many questions hide exceptions in the stem.",
      "When two answers sound right, choose the one that emphasizes safety + legality (inspection, stopping, reporting, control).",
      "If the question mentions ‘air pressure’, ‘warning’, or ‘leak’, the safest action is usually to stop and correct before continuing.",
      "If a scenario feels like a trap, slow down: test questions often reward the first safe step, not the final fix.",
    ];
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="blue">{code} CDL</Pill>
        <Pill tone="slate">State Handbook Style</Pill>
        <Pill tone="amber">Exam Wording</Pill>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Overview</div>
        <div className="text-white font-black">{headline}</div>
        <div className="mt-3">
          <BulletList items={keyFacts} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="High-Yield Compliance Themes" icon="🧾">
          <BulletList items={compliance} />
        </SectionCard>

        <SectionCard title="Driving Safety Themes" icon="🛡️">
          <BulletList items={safety} />
        </SectionCard>

        <SectionCard title="Inspection & Equipment Logic" icon="🔍">
          <BulletList items={inspection} />
        </SectionCard>

        <SectionCard title="Test Strategy That Works" icon="🎯">
          <BulletList items={examTactics} />
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-[11px] text-slate-500">
          Tip: if you switch your state in onboarding, this sheet updates instantly so your study wording stays consistent.
        </span>
      </div>
    </div>
  );
}

type ModuleSection = { title: string; bullets: string[]; icon?: string };

function buildModuleNotes(category: string): ModuleSection[] {
  // Production content (no “drop a PDF” or placeholder instructions).
  const base: ModuleSection[] = [
    {
      title: "What the test is really checking",
      icon: "🧠",
      bullets: [
        "Whether you recognize the safest first action (slow down, stop, secure, inspect) before anything else.",
        "Whether you know the system’s purpose (what the part does) and the failure risk (what happens if it’s wrong).",
        "Whether you can apply a rule to a scenario (not memorize a sentence).",
      ],
    },
    {
      title: "Answer-pattern traps",
      icon: "⚠️",
      bullets: [
        "Two options can be ‘true’—the correct one is usually the safest and most immediate action.",
        "Watch for hidden qualifiers: downhill, wet roads, night, heavy load, air pressure, warning light.",
        "Avoid aggressive driving answers (speeding up, late braking, tight following) unless the scenario explicitly requires it.",
      ],
    },
  ];

  const byCat: Record<string, ModuleSection[]> = {
    "General Knowledge": [
      {
        title: "Core rules that show up everywhere",
        icon: "📘",
        bullets: [
          "Safety-first decision making: control the vehicle, protect the scene, then communicate and document.",
          "Basic CMV control: smooth steering, controlled braking, lane discipline, and scanning far ahead.",
          "Weight & balance intuition: heavier loads increase stopping distance and reduce maneuver tolerance.",
          "Know common disqualifier topics: reckless behavior, impaired driving, leaving the scene, and serious violations.",
        ],
      },
      ...base,
    ],
    "Driving Safely": [
      {
        title: "The ‘safe driver’ checklist",
        icon: "🛡️",
        bullets: [
          "Space + speed management: keep room to stop and room to escape; adjust early, not late.",
          "Scan, identify, predict: intersections, merges, work zones, pedestrians, and aggressive drivers.",
          "Weather response: reduce speed before the hazard, increase following distance, and avoid sudden inputs.",
          "Downhill control: choose a safe speed early, use proper gear/braking technique, and avoid overheating brakes.",
        ],
      },
      ...base,
    ],
    "Air Brakes": [
      {
        title: "How exam questions are framed",
        icon: "💨",
        bullets: [
          "Expect scenarios about warning devices, pressure loss, and what to do when a system is not building air correctly.",
          "Know the idea of an air leak being dangerous because braking capacity depends on stored air pressure.",
          "Test writers emphasize ‘stop safely and fix’ when braking integrity is in doubt.",
        ],
      },
      {
        title: "High-yield system concepts",
        icon: "⚙️",
        bullets: [
          "Air pressure builds from the compressor and must stay within safe operating range.",
          "Low-air warnings exist so you act before braking becomes unreliable.",
          "Parking brakes/spring brakes are designed to engage when pressure is too low—know the safety intent.",
        ],
      },
      ...base,
    ],
    "Pre-Trip Inspection": [
      {
        title: "Inspection logic the DMV loves",
        icon: "🔍",
        bullets: [
          "A good inspection is systematic: front-to-back, top-to-bottom, outside then in-cab checks.",
          "Use consistent language: secure, mounted, not leaking, not damaged, proper inflation/tread, no visible defects.",
          "If the question mentions leaks, missing parts, or unsafe tires/brakes—your correct action is usually to take it out of service.",
        ],
      },
      {
        title: "Commonly-tested components",
        icon: "🧰",
        bullets: [
          "Tires/wheels: tread, inflation, damage, lug nuts, rims—these are frequent test targets.",
          "Brakes: linings, drums, hoses/chambers—anything compromised is a ‘do not drive’ situation.",
          "Lights/reflectors: visibility and legal compliance—expect questions about mandatory functioning lights.",
        ],
      },
      ...base,
    ],
    "Combination Vehicles": [
      {
        title: "What separates combo questions",
        icon: "🔗",
        bullets: [
          "Coupling/uncoupling safety steps: secure vehicle, verify connection, and check before moving.",
          "Trailer swing, off-tracking, and longer stopping distances are core scenario themes.",
          "If the question mentions coupling integrity, always prioritize verification before driving.",
        ],
      },
      ...base,
    ],
    "Doubles/Triples": [
      {
        title: "Doubles/Triples focus areas",
        icon: "🚛",
        bullets: [
          "Stability and handling: more articulation points means more risk from speed, wind, and sudden inputs.",
          "Spacing and braking: longer stopping distance and less tolerance for aggressive maneuvers.",
          "Hookup order and inspection steps: secure, connect correctly, and check before moving.",
        ],
      },
      ...base,
    ],
    "Tank Vehicles": [
      {
        title: "Tank vehicle reality",
        icon: "💧",
        bullets: [
          "Liquid surge/slosh is the key concept: it changes braking/turning behavior.",
          "Smooth control matters: gentle acceleration, braking, and steering reduce surge risk.",
          "Expect scenario questions that reward slow, deliberate inputs and extra space.",
        ],
      },
      ...base,
    ],
    "Hazardous Materials": [
      {
        title: "Hazmat question patterns",
        icon: "☢️",
        bullets: [
          "Placards and shipping papers appear often—questions focus on knowing what must be present and how it’s used.",
          "Safety actions come first: protect yourself and the public, communicate, and follow procedures.",
          "Expect items on prohibited actions (unsafe parking/ignition sources) and strict compliance mindset.",
        ],
      },
      ...base,
    ],
    Passenger: [
      {
        title: "Passenger emphasis",
        icon: "👥",
        bullets: [
          "Safety + communication: secure stops, passenger control, and clear procedures.",
          "Expect questions about safe loading/unloading, emergency exits, and defensive driving.",
          "Test writers reward calm, methodical actions that protect passengers first.",
        ],
      },
      ...base,
    ],
    "School Bus": [
      {
        title: "School bus emphasis",
        icon: "🚸",
        bullets: [
          "Child safety procedures are central: loading/unloading discipline and hazard awareness.",
          "Expect scenario questions that reward stopping early, scanning, and strict procedure compliance.",
          "If the question involves students near the bus, the safest action and visibility check usually wins.",
        ],
      },
      ...base,
    ],
    "Transporting Cargo": [
      {
        title: "Cargo questions",
        icon: "📦",
        bullets: [
          "Securement logic: prevent movement, distribute weight, and re-check periodically.",
          "Expect questions about shifting loads and how they affect control (rollover risk, braking distance).",
          "Test writers reward inspection and re-tightening discipline over ‘keep driving’ answers.",
        ],
      },
      ...base,
    ],
    "Vehicle Control": [
      {
        title: "Control under pressure",
        icon: "⚙️",
        bullets: [
          "Skids and recovery: don’t panic; reduce speed, steer deliberately, avoid overcorrection.",
          "Curves and ramps: slow before entering; avoid hard braking mid-curve.",
          "Emergency situations: choose the least-bad outcome—protect life first, then property.",
        ],
      },
      ...base,
    ],
    "Safety Systems": [
      {
        title: "Systems & warnings",
        icon: "🚨",
        bullets: [
          "Warning lights and gauges exist so you act early—questions usually reward immediate safe response.",
          "If a system affects braking/steering/visibility, the correct answer often involves stopping to address it.",
          "Know the purpose of safety devices (not just names): why they exist, what failure looks like, and what action follows.",
        ],
      },
      ...base,
    ],
  };

  return byCat[category] || [
    {
      title: "Module essentials",
      icon: "📚",
      bullets: [
        "Expect scenario-style questions: choose the safest first action and the most compliant procedure.",
        "Learn the parts, but focus on why they matter (failure risk) and what you do when something is wrong.",
        "When unsure, pick the answer that increases safety margin: slow down, increase space, stop to inspect, secure the load.",
      ],
    },
    ...base,
  ];
}

function ModuleNotesViewer({ category }: { category: string }) {
  const sections = useMemo(() => buildModuleNotes(category), [category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="slate">Module Notes</Pill>
        <Pill tone="blue">{category}</Pill>
        <Pill tone="amber">High-Yield</Pill>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <SectionCard key={s.title} title={s.title} icon={s.icon}>
            <BulletList items={s.bullets} />
          </SectionCard>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">How to use this</div>
        <div className="text-sm text-slate-300 leading-relaxed">
          Open these notes side-by-side with practice questions. When you miss a question, identify which rule or safety principle it
          tested, then re-run 10–15 questions from the same module.
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

  const [stateSheetOpen, setStateSheetOpen] = useState(false);
  const [moduleNotesOpen, setModuleNotesOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string>("");

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

  const openModuleNotes = useCallback((cat: string) => {
    setActiveModule(cat);
    setModuleNotesOpen(true);
  }, []);

  const stateName = useMemo(() => getStateName(userState), [userState]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* State Quick Sheet modal */}
      <Modal
        open={stateSheetOpen}
        title={`${stateName} (${userState}) — CDL Quick Sheet`}
        subtitle="High-yield handbook-style notes tuned to common DMV test wording."
        onClose={() => setStateSheetOpen(false)}
      >
        <StateQuickSheet stateCode={userState} license={license} endorsements={endorsements} />
      </Modal>

      {/* Module Notes modal */}
      <Modal
        open={moduleNotesOpen}
        title={`${activeModule || "Module"} — Manual Notes`}
        subtitle="Production study notes for this module."
        onClose={() => setModuleNotesOpen(false)}
      >
        <ModuleNotesViewer category={activeModule || "General Knowledge"} />
      </Modal>

      {/* Header */}
      <header className="px-6 pt-10 pb-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Training Console</div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Technical Manuals</h1>
            <p className="text-sm text-slate-400 font-mono">
              RIG CONFIGURATION: <span className="text-amber-500">CLASS {license}</span>{" "}
              <span className="text-slate-600">•</span>{" "}
              <span className="text-slate-400">
                {userState} DMV ({stateName})
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="slate">Manuals</Pill>
              <Pill tone="slate">Study Mode</Pill>
              <Pill tone="amber">Quick Sheets</Pill>
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
        {/* Focus Target */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.16),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Recommended Focus</div>
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

        {/* Jurisdiction panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">JURISDICTION DATA</div>
            <div className="font-bold text-white text-sm truncate">{userState} DMV Quick Sheet</div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">
              Handbook-style notes tuned to common state exam phrasing.
            </div>
          </div>
          <button
            onClick={() => setStateSheetOpen(true)}
            className="shrink-0 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30"
          >
            VIEW QUICK SHEET
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
                              <span className="text-slate-600">
                                ({st.mastered}/{st.total})
                              </span>
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
                        {/* Manual notes button (does not navigate) */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModuleNotes(cat);
                          }}
                          className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors"
                          title="Open module manual notes"
                        >
                          Manual Notes
                        </button>

                        {/* micro ring */}
                        <div className="relative w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                          <div className="text-[10px] font-mono text-slate-400">{st.pct}</div>
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                              boxShadow:
                                st.pct < 80 ? "0 0 0 0 rgba(245,158,11,0)" : "0 0 0 0 rgba(16,185,129,0)",
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
            Back to Dashboard
          </Link>
        </div>
      </main>

      <Dock />
    </div>
  );
}
