"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createIpdr, IpdrRecord, listIpdr } from "@/lib/api";

export default function IpdrPage() {
  const caseId = useParams()?.id as string;
  const [sourceIp, setSourceIp] = useState("");
  const [destinationIp, setDestinationIp] = useState("");
  const [protocol, setProtocol] = useState("TCP");
  const [records, setRecords] = useState<IpdrRecord[]>([]);
  const [error, setError] = useState("");
  const load = () => listIpdr(caseId).then(setRecords).catch((err: Error) => setError(err.message));
  useEffect(() => { if (caseId) load(); }, [caseId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createIpdr(caseId, { source_ip: sourceIp, destination_ip: destinationIp, protocol });
      setSourceIp(""); setDestinationIp(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add IPDR record."); }
  }
  return <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
    <h1 className="text-xl font-semibold text-text">Add IPDR Records</h1>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border-soft bg-surface p-6">
      <input required value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} placeholder="Source IP" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input required value={destinationIp} onChange={(e) => setDestinationIp(e.target.value)} placeholder="Destination IP" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="Protocol" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <button className="w-fit rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black">Add Record</button>
    </form>
    <div className="space-y-2">{records.map((r) => <div key={r.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-text">{r.source_ip} → {r.destination_ip} ({r.protocol})</div>)}</div>
  </div>;
}
