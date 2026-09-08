"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase } from "@/lib/api";

export default function NewCasePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [caseType, setCaseType] = useState("Financial Fraud");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [mode, setMode] = useState<"entity" | "evidence" | "event">("entity");
  const [seedType, setSeedType] = useState<"phone" | "bank_account" | "social_handle">("phone");
  const [seedValue, setSeedValue] = useState("");
  const [evidenceType, setEvidenceType] = useState<"CDR" | "IPDR" | "Banking" | "Social" | "Identity">("CDR");
  const [incidentDate, setIncidentDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Case name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createCase({
        name: name.trim(),
        case_type: caseType,
        description: description.trim() || undefined,
        priority,
        investigation_mode: mode,
        seed_type: mode === "entity" ? seedType : undefined,
        seed_value: mode === "entity" ? seedValue.trim() : undefined,
        evidence_type: mode === "evidence" ? evidenceType : undefined,
        incident_date: mode === "event" ? incidentDate : undefined,
        event_description: mode === "event" ? eventDescription.trim() || undefined : undefined,
      });
      router.push(`/case/${created.id}`);
    } catch (err) {
      setError("Failed to create case. Check that the backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-6 text-xl font-semibold text-text">New Case</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-faint">Case Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fan-in Mule Network, Sector 18"
            className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-faint">Case Type</label>
          <select value={caseType} onChange={(e) => setCaseType(e.target.value)} className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text">
            {["Financial Fraud", "Cybercrime", "Missing Person", "Trafficking", "Other"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-faint">Brief Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-faint">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text">
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-faint">Entry Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text">
            <option value="entity">Entity-led</option><option value="evidence">Evidence-led</option><option value="event">Event-led</option>
          </select>
        </div>
        {mode === "entity" && <div className="grid gap-3 sm:grid-cols-2"><select value={seedType} onChange={(e) => setSeedType(e.target.value as typeof seedType)} className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text"><option value="phone">Phone</option><option value="bank_account">Bank Account</option><option value="social_handle">Social Handle</option></select><input value={seedValue} onChange={(e) => setSeedValue(e.target.value)} placeholder="Known identifier" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" /></div>}
        {mode === "evidence" && <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as typeof evidenceType)} className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text"><option>CDR</option><option>IPDR</option><option>Banking</option><option>Social</option><option>Identity</option></select>}
        {mode === "event" && <div className="grid gap-3 sm:grid-cols-2"><input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" /><input value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Brief event description" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" /></div>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Case"}
        </button>
      </form>
    </div>
  );
}