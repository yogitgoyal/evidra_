"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createIdentity, IdentityRecord, listIdentity } from "@/lib/api";
import { formatEvidenceDateTime } from "@/lib/utils";

export default function IdentityPage() {
  const caseId = useParams()?.id as string;
  const [subject, setSubject] = useState("");
  const [documentType, setDocumentType] = useState("Aadhaar");
  const [documentHash, setDocumentHash] = useState("");
  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [error, setError] = useState("");
  const load = () => listIdentity(caseId).then(setRecords).catch((err: Error) => setError(err.message));
  useEffect(() => { if (caseId) load(); }, [caseId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createIdentity(caseId, { subject, document_type: documentType, document_hash: documentHash });
      setSubject(""); setDocumentHash(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add identity record."); }
  }
  return <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 px-6 py-8 lg:px-8">
    <h1 className="text-xl font-semibold text-text">Add Identity Records</h1>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border-soft bg-surface p-6">
      <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="block w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="Document type" className="block w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input required value={documentHash} onChange={(e) => setDocumentHash(e.target.value)} placeholder="Document hash" className="block w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <button className="block w-fit rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black">Add Record</button>
    </form>
    <h2 className="mb-3 text-sm font-semibold text-text-faint uppercase tracking-wide">
      Records ({records.length})
    </h2>
    <div className="space-y-2">{records.map((r) => (
      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm">
        <span className="text-text">{r.subject} · {r.document_type} · {r.document_hash}</span>
        <span className="text-xs text-text-faint">{formatEvidenceDateTime(r.timestamp)}</span>
      </div>
    ))}</div>
  </div>;
}
