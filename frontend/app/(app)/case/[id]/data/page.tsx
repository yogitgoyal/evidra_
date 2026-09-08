"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createCdr, listCdr, CdrRecord } from "@/lib/api";

export default function CaseDataPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [caller, setCaller] = useState("");
  const [callee, setCallee] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CdrRecord[]>([]);

  async function loadRecords() {
    try {
      const data = await listCdr(caseId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CDR records.");
    }
  }

  useEffect(() => {
    if (caseId) loadRecords();
  }, [caseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caller.trim() || !callee.trim()) {
      setError("Both caller and callee numbers are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createCdr(caseId, {
        caller,
        callee,
        duration_seconds: duration ? parseInt(duration, 10) : 0,
      });
      setCaller("");
      setCallee("");
      setDuration("");
      await loadRecords();
    } catch (err) {
      setError("Failed to add record. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <h1 className="text-xl font-semibold text-text">Add Call Records (CDR)</h1>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border-soft bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-faint">Caller Number</label>
            <input
              type="text"
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-faint">Callee Number</label>
            <input
              type="text"
              value={callee}
              onChange={(e) => setCallee(e.target.value)}
              placeholder="e.g. 9123456780"
              className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-faint">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 120"
            className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Record"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-faint uppercase tracking-wide">
          Records ({records.length})
        </h2>
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm"
            >
              <span className="text-text">
                {r.caller} → {r.callee}
              </span>
              <span className="text-text-faint">{r.duration_seconds}s</span>
            </div>
          ))}
          {records.length === 0 && (
            <p className="text-sm text-text-faint">No records yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}