"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Button } from "@/components/ui/primitives";
import { Fingerprint, FileSearch2, MapPinned, ArrowRight, Search, RotateCcw, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCase } from "@/lib/api";

const modes = [
  { id: "entity", label: "Entity-led", icon: Fingerprint, placeholder: "Phone, account, handle, or IP…", helper: "Start from something you already know." },
  { id: "evidence", label: "Evidence-led", icon: FileSearch2, placeholder: "Transaction ID, record ID, or file…", helper: "Start from a clue with an unknown identity." },
  { id: "event", label: "Event-led", icon: MapPinned, placeholder: "Incident window, e.g. Sector 18, Aug 20 13:00–15:00…", helper: "Start from an incident window, suspect unknown." },
] as const;

export function StartInvestigation() {
  const [active, setActive] = useState<(typeof modes)[number]["id"]>("entity");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState("Financial Fraud");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [value, setValue] = useState("");
  const [seedType, setSeedType] = useState<"phone" | "bank_account" | "social_handle">("phone");
  const [evidenceType, setEvidenceType] = useState<"CDR" | "IPDR" | "Banking" | "Social" | "Identity">("CDR");
  const [incidentDate, setIncidentDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const current = modes.find((m) => m.id === active)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Case name is required.");
      return;
    }
    setLoading(true);
    try {
      const created = await createCase({
        name: name.trim(),
        case_type: caseType || undefined,
        description: description.trim() || undefined,
        priority,
        investigation_mode: active,
        seed_type: active === "entity" ? seedType : undefined,
        seed_value: active === "entity" ? value.trim() : undefined,
        evidence_type: active === "evidence" ? evidenceType : undefined,
        incident_date: active === "event" ? incidentDate : undefined,
        event_description: active === "event" ? eventDescription.trim() || undefined : undefined,
      });
      router.push(`/case/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create investigation.");
      setLoading(false);
    }
  }

  return (
    <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative w-full min-w-0 p-6">
      {/* Header with three-dot menu icon */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight text-text">Start an investigation</h3>
          <p className="mt-0.5 text-xs text-text-dim">Choose the entry point that matches what you have.</p>
        </div>
        <button
          type="button"
          aria-label="Investigation options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text-dim"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-6 top-14 z-20 w-44 rounded-lg border border-border-soft bg-surface p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setError(null);
                setMenuOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-xs text-text-dim hover:bg-surface-2 hover:text-text"
            >
              Clear investigation
            </button>
          </div>
        )}
      </div>

      {/* Fully rounded pill-shaped segmented tab control */}
      <div className="mb-5 flex w-full min-w-0 rounded-full bg-surface-2 p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(m.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition-all",
              active === m.id
                ? "bg-surface text-text card-shadow border border-border/40"
                : "text-text-dim hover:text-text"
            )}
          >
            <m.icon size={14} className={active === m.id ? "text-cyan" : "text-text-faint"} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="w-full min-w-0"
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="text-xs font-medium text-text-faint">
                Case name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sector 18 fraud network" className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15" />
              </label>
              <label className="text-xs font-medium text-text-faint">
                Case type
                <select value={caseType} onChange={(e) => setCaseType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60">
                  {["Financial Fraud", "Cybercrime", "Missing Person", "Trafficking", "Other"].map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-text-faint sm:col-span-2">
                Brief description
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is being investigated?" rows={2} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15" />
              </label>
              <label className="text-xs font-medium text-text-faint">
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60">
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </label>
            </div>
            <label className="mb-2 mt-3 block text-xs font-medium text-text-faint">{current.helper}</label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {active === "entity" && <><select value={seedType} onChange={(e) => setSeedType(e.target.value as typeof seedType)} className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60"><option value="phone">Phone</option><option value="bank_account">Bank Account</option><option value="social_handle">Social Handle</option></select><div className="relative w-full sm:flex-1"><Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" /><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={current.placeholder} className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-10 pr-3.5 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15" /></div></>}
              {active === "evidence" && <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as typeof evidenceType)} className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60"><option>CDR</option><option>IPDR</option><option>Banking</option><option>Social</option><option>Identity</option></select>}
              {active === "event" && <><input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-cyan/60" /><input value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Brief event description" className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-cyan/60" /></>}
              <Button type="submit" disabled={loading} className="shrink-0 rounded-xl px-5">
                {loading ? "Opening…" : "Investigate"} <ArrowRight size={15} />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </form>
      {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}

      {/* Suggestion chips + Clear all text link with refresh icon */}
      <div className="mt-4 flex w-full items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-text-faint">Suggestions:</span>
          {["+91 98•••4471", "txn_0193", "Sector 18, Aug 20"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setValue(s)}
              className="rounded-full border border-border-soft bg-surface-2 px-3 py-1 font-mono text-[11px] text-text-dim transition-colors hover:border-cyan/40 hover:bg-cyan-dim hover:text-cyan"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setValue("")}
          className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-text-faint transition-colors hover:text-text-dim"
        >
          <RotateCcw size={11} /> Clear all
        </button>
      </div>
    </Card>
  );
}
