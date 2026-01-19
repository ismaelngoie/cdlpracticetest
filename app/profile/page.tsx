// app/profile/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Dock from "@/components/Dock";
import { motion, AnimatePresence } from "framer-motion";

type ExamHistoryItem = {
  ts: number; // Date.now()
  score: number; // 0-100
  passed: boolean;
  mode: "sim" | "station";
  durationSec?: number;
  correct?: number;
  total?: number;
};

type AccessState = "unknown" | "none" | "subscription" | "lifetime";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatDate(ts: number) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function shortEndorsements(endorsements: string[]) {
  const map: Record<string, string> = {
    Hazmat: "H",
    "Hazardous Materials": "H",
    Tank: "N",
    "Tank Vehicles": "N",
    Double: "T",
    Doubles: "T",
    "Doubles/Triples": "T",
    Triples: "T",
    Passenger: "P",
    "School Bus": "S",
    "Air Brakes": "A",
  };
  const letters = endorsements
    .map((e) => map[e] || e?.[0]?.toUpperCase())
    .filter(Boolean);
  return letters.join("") || "NONE";
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadExamHistory(): ExamHistoryItem[] {
  const hist = loadJson<ExamHistoryItem[]>("haul-exam-history", []);
  return Array.isArray(hist)
    ? hist
        .filter((x) => x && typeof x.ts === "number" && typeof x.score === "number")
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 12)
    : [];
}

function computeTrend(history: ExamHistoryItem[]) {
  const last3 = history.slice(0, 3);
  const prev3 = history.slice(3, 6);

  const avg = (arr: ExamHistoryItem[]) =>
    arr.length ? Math.round(arr.reduce((s, x) => s + x.score, 0) / arr.length) : 0;

  const a = avg(last3);
  const b = avg(prev3);
  const delta = a - b;

  return { recentAvg: a, priorAvg: b, delta };
}

// Centered, scroll-safe modal (for billing email + UX)
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
              className="w-full max-w-lg"
              initial={{ y: 12, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.985 }}
              transition={{ duration: 0.18 }}
            >
              <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Account & Billing
                    </div>
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

async function postJson<T>(
  url: string,
  body: any
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(body),
    });

    const status = res.status;
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const msg = json?.error || json?.message || `Request failed (${status})`;
      return { ok: false, status, error: String(msg) };
    }

    return { ok: true, status, data: json as T };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || "Network error" };
  }
}

async function createBillingPortalUrl(email: string): Promise<string> {
  // Try the newer endpoint first, then fallback.
  const payload = {
    email,
    returnUrl: typeof window !== "undefined" ? `${window.location.origin}/profile` : "/profile",
  };

  const candidates = ["/api/billing/portal", "/api/billing-portal"];

  let lastErr = "Unable to create billing portal session.";

  for (const path of candidates) {
    const r = await postJson<{ ok?: boolean; url?: string; error?: string }>(path, payload);

    // Route missing? keep trying next candidate.
    if (!r.ok && (r.status === 404 || r.status === 405)) {
      lastErr = r.error || lastErr;
      continue;
    }

    if (!r.ok) {
      lastErr = r.error || lastErr;
      continue;
    }

    const data: any = r.data;
    if (data?.ok && data?.url && typeof data.url === "string") return data.url;

    lastErr = data?.error || "Stripe portal URL missing.";
  }

  throw new Error(lastErr);
}

async function checkAccess(email: string): Promise<AccessState> {
  const r = await postJson<{ ok?: boolean; access?: string; error?: string }>("/api/login", { email });
  if (!r.ok) return "unknown";
  const data: any = r.data;
  if (data?.ok && data?.access === "subscription") return "subscription";
  if (data?.ok && data?.access === "lifetime") return "lifetime";
  return "none";
}

export default function ProfilePage() {
  const [license, setLicense] = useState("A");
  const [name, setName] = useState("OPERATOR");
  const [endorsements, setEndorsements] = useState<string[]>([]);
  const [userState, setUserState] = useState("TX");

  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [arm, setArm] = useState<"locked" | "confirm">("locked");

  const [idCode, setIdCode] = useState<string>("—");
  const [hydrated, setHydrated] = useState(false);

  // Billing
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [emailDraft, setEmailDraft] = useState<string>("");
  const [billingModalOpen, setBillingModalOpen] = useState(false);

  const [access, setAccess] = useState<AccessState>("unknown");
  const [billingBusy, setBillingBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "ok" | "warn" | "err"; msg: string } | null>(null);

  // Privacy / Disclaimer accordion
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);

    setLicense(localStorage.getItem("userLevel") || "A");
    setUserState((localStorage.getItem("userState") || "TX").toUpperCase());

    setName(localStorage.getItem("userName") || "OPERATOR");

    const ends = loadJson<string[]>("userEndorsements", []);
    setEndorsements(Array.isArray(ends) ? ends : []);

    setHistory(loadExamHistory());

    // Billing email (if previously saved)
    const be = String(
      localStorage.getItem("billingEmail") ||
        localStorage.getItem("haulOS.email.v1") ||
        localStorage.getItem("userEmail") ||
        ""
    )
      .trim()
      .toLowerCase();
    if (be) {
      setBillingEmail(be);
      setEmailDraft(be);
      try {
        localStorage.setItem("billingEmail", be);
      } catch {}
    }

    // Operator ID (client-side only)
    try {
      const existing = localStorage.getItem("haul-operator-id");
      if (existing) {
        setIdCode(existing);
      } else {
        const val = `CP-${Math.floor(10000 + Math.random() * 89999)}`;
        localStorage.setItem("haul-operator-id", val);
        setIdCode(val);
      }
    } catch {
      setIdCode("CP-00000");
    }
  }, []);

  // Auto-check access when we have an email
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!hydrated) return;
      if (!billingEmail || !billingEmail.includes("@")) {
        setAccess("unknown");
        return;
      }
      const a = await checkAccess(billingEmail);
      if (!alive) return;
      setAccess(a);
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, billingEmail]);

  const stats = useMemo(() => {
    const exams = history.length;
    const passed = history.filter((h) => h.passed).length;
    const passRate = exams ? Math.round((passed / exams) * 100) : 0;
    const best = exams ? Math.max(...history.map((h) => h.score)) : 0;
    const lastScore = exams ? history[0]?.score ?? 0 : 0;

    let streak = 0;
    for (const h of history) {
      if (h.passed) streak += 1;
      else break;
    }

    return { exams, passed, passRate, best, streak, lastScore };
  }, [history]);

  const trend = useMemo(() => computeTrend(history), [history]);

  const readiness = useMemo(() => {
    // Readiness is driven only by real history.
    const base = stats.passRate;
    const bestBonus = clamp(stats.best - 80, 0, 20);
    const streakBonus = clamp(stats.streak * 4, 0, 12);
    const score = clamp(Math.round(base * 0.7 + bestBonus + streakBonus), 0, 100);

    if (score >= 85)
      return {
        label: "READY",
        color: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-500/10",
        bar: "from-emerald-500 to-emerald-300",
      };
    if (score >= 70)
      return {
        label: "NEAR READY",
        color: "text-amber-400",
        border: "border-amber-500/40",
        bg: "bg-amber-500/10",
        bar: "from-amber-500 to-amber-300",
      };
    return {
      label: "IN TRAINING",
      color: "text-red-400",
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      bar: "from-red-500 to-red-300",
    };
  }, [stats]);

  const accessBadge = useMemo(() => {
    if (access === "subscription")
      return { text: "SUBSCRIPTION ACTIVE", tone: "emerald" as const, hint: "Manage billing, invoices, or cancel anytime." };
    if (access === "lifetime")
      return { text: "LIFETIME ACCESS", tone: "blue" as const, hint: "You’re unlocked permanently for this product." };
    if (access === "none")
      return { text: "NO ACTIVE PLAN", tone: "amber" as const, hint: "Use the email you paid with to manage access." };
    return { text: "STATUS UNKNOWN", tone: "slate" as const, hint: "Add a billing email to check your plan status." };
  }, [access]);

  const handleReconfigure = () => {
    window.location.href = "/";
  };

  const saveName = useCallback(() => {
    const clean = name.trim().slice(0, 32) || "OPERATOR";
    setName(clean);
    try {
      localStorage.setItem("userName", clean);
    } catch {}
    setBanner({ tone: "ok", msg: "Profile updated." });
    setTimeout(() => setBanner(null), 2200);
  }, [name]);

  const openBillingFlow = useCallback(async () => {
    // If we don’t have a valid email, prompt.
    const e = (billingEmail || "").trim().toLowerCase();
    if (!e || !e.includes("@")) {
      setEmailDraft(e);
      setBillingModalOpen(true);
      return;
    }

    setBillingBusy(true);
    setBanner(null);
    try {
      const url = await createBillingPortalUrl(e);
      const w = window.open(url, "billing", "noopener,noreferrer,width=520,height=740");
if (!w) window.location.href = url;
    } catch (err: any) {
      setBanner({ tone: "err", msg: err?.message || "Could not open billing portal." });
      setTimeout(() => setBanner(null), 4200);
    } finally {
      setBillingBusy(false);
    }
  }, [billingEmail]);

  const saveBillingEmailAndContinue = useCallback(async () => {
    const e = (emailDraft || "").trim().toLowerCase();
    if (!e || !e.includes("@")) {
      setBanner({ tone: "warn", msg: "Enter the email you used at checkout." });
      setTimeout(() => setBanner(null), 2600);
      return;
    }

    setBillingEmail(e);
    try {
      localStorage.setItem("billingEmail", e);
      localStorage.setItem("haulOS.email.v1", e);
      localStorage.setItem("userEmail", e);
    } catch {}

    setBillingModalOpen(false);

    // re-check access in background + open portal
    setBillingBusy(true);
    setBanner(null);
    try {
      const url = await createBillingPortalUrl(e);
      const w = window.open(url, "billing", "noopener,noreferrer,width=520,height=740");
if (!w) window.location.href = url;
    } catch (err: any) {
      setBanner({ tone: "err", msg: err?.message || "Could not open billing portal." });
      setTimeout(() => setBanner(null), 4200);
    } finally {
      setBillingBusy(false);
    }
  }, [emailDraft]);

  const refreshAccess = useCallback(async () => {
    const e = (billingEmail || "").trim().toLowerCase();
    if (!e || !e.includes("@")) {
      setBanner({ tone: "warn", msg: "Add your billing email to check subscription status." });
      setTimeout(() => setBanner(null), 2800);
      return;
    }
    setBillingBusy(true);
    setBanner(null);
    try {
      const a = await checkAccess(e);
      setAccess(a);
      setBanner({ tone: "ok", msg: "Billing status refreshed." });
      setTimeout(() => setBanner(null), 2200);
    } catch {
      setBanner({ tone: "err", msg: "Could not refresh status." });
      setTimeout(() => setBanner(null), 2800);
    } finally {
      setBillingBusy(false);
    }
  }, [billingEmail]);

  const handleFactoryReset = () => {
    if (arm === "locked") {
      setArm("confirm");
      setTimeout(() => setArm("locked"), 4500);
      return;
    }
    const ok = confirm("Factory Reset will wipe local progress on this device. Confirm?");
    if (!ok) return;
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_55%)]" />

      {/* Billing modal */}
      <Modal
        open={billingModalOpen}
        title="Manage Subscription"
        subtitle="Enter the email you used at checkout. We’ll open the secure billing portal."
        onClose={() => setBillingModalOpen(false)}
      >
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Billing Email</div>
          <input
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
          />
          <div className="text-xs text-slate-400 leading-relaxed">
            If you’re not sure which email you used, search your inbox for your Stripe receipt.
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={saveBillingEmailAndContinue}
              disabled={billingBusy}
              className="flex-1 px-4 py-3 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-60"
            >
              Continue →
            </button>
            <button
              onClick={() => setBillingModalOpen(false)}
              className="px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            Support:{" "}
            <a
              className="underline text-white font-bold"
              href="mailto:contact@cdlpretest.com?subject=Support%20Request%20-%20CDL%20PreTest&body=Please%20include%20the%20email%20you%20paid%20with%20and%20a%20brief%20description%20of%20the%20issue."
            >
              contact@cdlpretest.com
            </a>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <header className="px-6 pt-10 pb-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Profile</div>
            <h1 className="text-3xl font-black tracking-tight text-white">Driver Logbook</h1>
            <p className="text-sm text-slate-400 font-mono mt-1">
              {userState} DMV • <span className="text-amber-400">CLASS {license}</span> • ID:{" "}
              <span className="text-slate-300">{hydrated ? idCode : "—"}</span>
            </p>
          </div>

          <div className={`shrink-0 px-3 py-2 rounded-2xl border ${readiness.border} ${readiness.bg}`}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Readiness</div>
            <div className={`text-sm font-black tracking-widest ${readiness.color}`}>{readiness.label}</div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {banner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-4"
            >
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  banner.tone === "ok"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : banner.tone === "warn"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    : "bg-red-500/10 border-red-500/30 text-red-200"
                }`}
              >
                {banner.msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-4 max-w-3xl mx-auto space-y-6">
        {/* Top row */}
        <div className="grid md:grid-cols-5 gap-4">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="md:col-span-3 relative overflow-hidden rounded-3xl p-6 border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.18),transparent_60%)]" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60" />

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operator</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-white truncate">
                    {name || "OPERATOR"}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Endorsements
                      </div>
                      <div className="text-lg font-mono font-black text-white">
                        {shortEndorsements(endorsements)}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {endorsements.length ? endorsements.join(" • ") : "None configured"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Last Score
                      </div>
                      <div className="text-lg font-mono font-black text-white">{stats.lastScore}%</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {history.length ? `Updated ${formatDate(history[0].ts)}` : "No runs yet"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-[240px] sm:shrink-0 text-left sm:text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Account</div>

                  <div
                    className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border ${
                      accessBadge.tone === "emerald"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : accessBadge.tone === "blue"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
                        : accessBadge.tone === "amber"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-white/5 border-white/10 text-slate-200"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{accessBadge.text}</span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400 max-w-none sm:max-w-[200px]">
                    {accessBadge.hint}
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={openBillingFlow}
                      disabled={billingBusy}
                      className="w-full px-4 py-2 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-60"
                    >
                      {billingBusy ? "Opening…" : "Manage Subscription ↗"}
                    </button>

                    <button
                      onClick={() => {
                        setEmailDraft(billingEmail || "");
                        setBillingModalOpen(true);
                      }}
                      className="mt-2 w-full px-4 py-2 rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors"
                    >
                      Update Billing Email
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline edit */}
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Profile Settings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Operator name"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      Used only on this device (browser storage).
                    </div>
                  </div>
                  <button
                    onClick={saveName}
                    className="px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                CDL PreTest is an independent study tool — always follow your official state CDL handbook for exact wording.
              </div>
            </div>
          </motion.div>

          {/* Telemetry */}
          <div className="md:col-span-2 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telemetry</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${readiness.color}`}>
                  {readiness.label}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Pass Rate</span>
                    <span className="text-slate-200 font-black">{stats.passRate}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.passRate}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className={`h-full bg-gradient-to-r ${readiness.bar}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.exams}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Runs</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-emerald-400">{stats.passed}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Passed</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-amber-400">{stats.best}%</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Best</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.streak}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Streak</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trend (Last 3)</div>
                    <div
                      className={`text-xs font-black ${
                        trend.delta > 0 ? "text-emerald-400" : trend.delta < 0 ? "text-red-400" : "text-slate-400"
                      }`}
                    >
                      {trend.delta > 0 ? `+${trend.delta}` : `${trend.delta}`} pts
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Recent Avg: <span className="text-slate-200 font-black">{trend.recentAvg}%</span>{" "}
                    <span className="text-slate-600">•</span> Prior:{" "}
                    <span className="text-slate-200 font-black">{trend.priorAvg}%</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Billing</div>
                    <button
                      onClick={refreshAccess}
                      disabled={billingBusy}
                      className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors disabled:opacity-60"
                    >
                      {billingBusy ? "…" : "Refresh"}
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Email:{" "}
                    <span className="text-slate-200 font-mono font-black break-all">
                      {billingEmail ? billingEmail : "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Actions</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleReconfigure}
                  className="rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors p-4 text-left"
                >
                  <div className="text-sm font-black text-slate-200">Reconfigure</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Change Class / State</div>
                </button>

                <button
                  onClick={() => (window.location.href = "/study")}
                  className="rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors p-4 text-left"
                >
                  <div className="text-sm font-black text-slate-200">Manuals</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Study Station</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Activity</div>
              <div className="text-sm text-slate-300 mt-1">Last runs on this device</div>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {history.length ? `${history.length} records` : "No history saved yet"}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center">
                <div className="text-slate-200 font-black">No runs yet.</div>
                <div className="text-sm text-slate-500 mt-1">
                  Complete a simulator run or stations to generate score history.
                </div>
              </div>
            ) : (
              history.slice(0, 8).map((h, i) => (
                <motion.div
                  key={h.ts + "-" + i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          h.passed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        {h.passed ? "PASS" : "FAIL"}
                      </span>

                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {h.mode === "sim" ? "Full Simulation" : "Station"}
                      </span>

                      <span className="text-[10px] font-mono text-slate-600">• {formatDate(h.ts)}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-300">
                      Score: <span className="text-slate-100 font-black">{h.score}%</span>
                      {typeof h.durationSec === "number" && (
                        <>
                          <span className="text-slate-600"> • </span>
                          <span className="text-slate-400 font-mono">{formatTime(h.durationSec)}</span>
                        </>
                      )}
                      {typeof h.correct === "number" && typeof h.total === "number" && (
                        <>
                          <span className="text-slate-600"> • </span>
                          <span className="text-slate-400 font-mono">
                            {h.correct}/{h.total}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 w-10 h-10 rounded-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
                    <span className={`${h.passed ? "text-emerald-400" : "text-red-400"} font-black`}>{h.score}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* System Controls */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">System Controls</h3>

          <button
            onClick={handleReconfigure}
            className="w-full flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm font-black text-slate-200">Reconfigure Rig (Class / State / Endorsements)</span>
            <span className="text-slate-500">→</span>
          </button>

          {/* Privacy + Disclaimer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <button
              onClick={() => setPrivacyOpen((p) => !p)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-800 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-black text-slate-200">Privacy & Disclaimer</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  How we store progress • payments • product disclaimer • support
                </div>
              </div>
              <span className="text-slate-500">{privacyOpen ? "–" : "+"}</span>
            </button>

            <AnimatePresence initial={false}>
              {privacyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed space-y-3">
                    <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Privacy</p>

                    <p>
                      CDL PreTest stores your study progress (scores, history, and preferences) primarily on your device using
                      browser storage. If you clear site data or switch devices, your local progress may be removed.
                    </p>

                    <p>
                      Payments are processed by a third-party payment processor (Stripe). We do not store your card numbers or
                      banking details on our servers.
                    </p>

                    <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Disclaimer</p>

                    <p>
                      This product is an independent study tool for CDL written test preparation. It does not replace your
                      state CDL manual, official FMCSA materials, professional CDL training, or the requirements of your DMV/DOT.
                    </p>

                    <p>
                      <b>Not affiliated:</b> CDL PreTest is not affiliated with, endorsed by, or sponsored by any state DMV,
                      state DOT, FMCSA, or any testing provider. “CDL” refers to Commercial Driver License in general usage.
                    </p>

                    <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Support</p>

                    <p>
                      Need help?{" "}
                      <a
                        className="underline text-white font-bold"
                        href="mailto:contact@cdlpretest.com?subject=Support%20Request%20-%20CDL%20PreTest&body=Please%20include%20the%20email%20you%20paid%20with%20and%20a%20brief%20description%20of%20the%20issue."
                      >
                        contact@cdlpretest.com
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Factory Reset (armed) */}
          <div className="rounded-2xl border border-red-900/30 bg-red-900/10 overflow-hidden">
            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-between p-5 hover:bg-red-900/15 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-black text-red-300">
                  {arm === "locked" ? "Factory Reset" : "Tap again to ARM"}
                </div>
                <div className="text-[11px] text-red-200/70 mt-0.5">Wipes local progress on this device.</div>
              </div>
              <span className={`text-red-300 ${arm === "confirm" ? "animate-pulse" : ""}`}>⚠️</span>
            </button>

            <AnimatePresence>
              {arm === "confirm" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5"
                >
                  <div className="text-[11px] text-red-200/80">
                    Safety lock active for 4.5 seconds. Tap again to proceed.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Dock />
    </div>
  );
}
