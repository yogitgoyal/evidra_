"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createCdr, listCdr, CdrRecord, uploadCdrBulk, BulkUploadResponse } from "@/lib/api";

export default function CaseDataPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [caller, setCaller] = useState("");
  const [callee, setCallee] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CdrRecord[]>([]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResponse | null>(null);

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

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkFile && !bulkText.trim()) {
      setError("Choose a CSV file or paste CSV content first.");
      return;
    }
    setBulkLoading(true);
    setError(null);
    setBulkResult(null);
    try {
      const uploadFile = bulkText.trim()
        ? new File([bulkText], "pasted.csv", { type: "text/csv" })
        : bulkFile;
      if (!uploadFile) {
        setError("Choose a CSV file or paste CSV content first.");
        return;
      }
      setBulkResult(await uploadCdrBulk(caseId, uploadFile));
      setBulkFile(null);
      setBulkText("");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk CDR upload failed.");
    } finally {
      setBulkLoading(false);
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

      <form onSubmit={handleBulkSubmit} className="space-y-4 rounded-xl border border-cyan/30 bg-surface p-6">
        <div>
          <h2 className="text-sm font-semibold text-text">Bulk CSV upload</h2>
          <p className="mt-1 text-xs text-text-faint">Columns: caller, callee, duration_seconds, timestamp</p>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-faint"
        />
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="Or paste CSV content here"
          rows={6}
          className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
        />
        <button type="submit" disabled={bulkLoading} className="rounded-lg border border-cyan px-4 py-2 text-sm font-medium text-cyan disabled:opacity-50">
          {bulkLoading ? "Uploading..." : "Upload CSV"}
        </button>
        {bulkResult && (
          <div className="space-y-2 text-sm text-text">
            <p>{bulkResult.created} records added, {bulkResult.rejected.length} rejected.</p>
            {bulkResult.rejected.length > 0 && (
              <details>
                <summary className="cursor-pointer text-text-faint">Rejected rows</summary>
                <ul className="mt-2 list-disc pl-5 text-red-400">
                  {bulkResult.rejected.map((item) => <li key={item.row}>Row {item.row}: {item.reason}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
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