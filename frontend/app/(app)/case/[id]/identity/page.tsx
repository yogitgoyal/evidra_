"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createIdentity, IdentityRecord, listIdentity } from "@/lib/api";

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
  return <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
    <h1 className="text-xl font-semibold text-text">Add Identity Records</h1>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border-soft bg-surface p-6">
      <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="Document type" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input required value={documentHash} onChange={(e) => setDocumentHash(e.target.value)} placeholder="Document hash" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <button className="w-fit rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black">Add Record</button>
    </form>
    <div className="space-y-2">{records.map((r) => <div key={r.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-text">{r.subject} · {r.document_type} · {r.document_hash}</div>)}</div>
  </div>;
}
