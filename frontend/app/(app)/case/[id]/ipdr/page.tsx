"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BulkUploadResponse,
  createIpdr,
  downloadIpdrBulkUploadFile,
  IpdrRecord,
  listIpdr,
  uploadIpdrBulk,
} from "@/lib/api";

export default function IpdrPage() {
  const caseId = useParams()?.id as string;
  const [sourceIp, setSourceIp] = useState("");
  const [destinationIp, setDestinationIp] = useState("");
  const [protocol, setProtocol] = useState("TCP");
  const [records, setRecords] = useState<IpdrRecord[]>([]);
  const [error, setError] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResponse | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);

  const load = () => listIpdr(caseId).then(setRecords).catch((err: Error) => setError(err.message));

  useEffect(() => { if (caseId) load(); }, [caseId]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const batchId = bulkResult?.has_source_file ? bulkResult.batch_id : undefined;
    if (!batchId) {
      setSourceFileUrl(null);
      return;
    }
    downloadIpdrBulkUploadFile(caseId, batchId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSourceFileUrl(objectUrl);
      })
      .catch(() => setSourceFileUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caseId, bulkResult]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createIpdr(caseId, { source_ip: sourceIp, destination_ip: destinationIp, protocol });
      setSourceIp(""); setDestinationIp(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add IPDR record."); }
  }

  async function handleBulkSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!bulkFile && !bulkText.trim()) {
      setError("Choose a CSV/XLSX file or paste CSV content first.");
      return;
    }
    setBulkLoading(true);
    setError("");
    setBulkResult(null);
    try {
      const uploadFile = bulkText.trim()
        ? new File([bulkText], "pasted.csv", { type: "text/csv" })
        : bulkFile;
      if (!uploadFile) {
        setError("Choose a CSV/XLSX file or paste CSV content first.");
        return;
      }
      setBulkResult(
        await uploadIpdrBulk(
          caseId,
          uploadFile,
          bulkText.trim() ? "paste" : "file",
        ),
      );
      setBulkFile(null);
      setBulkText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk IPDR upload failed.");
    } finally {
      setBulkLoading(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
    <h1 className="text-xl font-semibold text-text">Add IPDR Records</h1>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border-soft bg-surface p-6">
      <input required value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} placeholder="Source IP" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input required value={destinationIp} onChange={(e) => setDestinationIp(e.target.value)} placeholder="Destination IP" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <input value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="Protocol" className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text" />
      <button className="w-fit rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black">Add Record</button>
    </form>

    <form onSubmit={handleBulkSubmit} className="space-y-4 rounded-xl border border-cyan/30 bg-surface p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">Bulk CSV/XLSX upload</h2>
        <p className="mt-1 text-xs text-text-faint">Columns: source_ip, destination_ip, protocol, timestamp</p>
      </div>
      <input
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
        className="block w-full text-sm text-text-faint"
      />
      <textarea
        value={bulkText}
        onChange={(event) => setBulkText(event.target.value)}
        placeholder="Or paste CSV content here"
        rows={6}
        className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
      />
      <button
        type="submit"
        disabled={bulkLoading}
        className="rounded-lg border border-cyan px-4 py-2 text-sm font-medium text-cyan disabled:opacity-50"
      >
        {bulkLoading ? "Uploading..." : "Upload CSV/XLSX"}
      </button>
      {bulkResult && (
        <div className="space-y-2 text-sm text-text">
          <p>{bulkResult.created} records added, {bulkResult.rejected.length} rejected.</p>
          {bulkResult.has_source_file && bulkResult.batch_id && sourceFileUrl && (
            <a
              href={sourceFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline"
            >
              View original CSV/XLSX
            </a>
          )}
          {bulkResult.rejected.length > 0 && (
            <details>
              <summary className="cursor-pointer text-text-faint">Rejected rows</summary>
              <ul className="mt-2 list-disc pl-5 text-red-400">
                {bulkResult.rejected.map((item) => (
                  <li key={item.row}>Row {item.row}: {item.reason}</li>
                ))}
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
          <div key={r.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-text">
            {r.source_ip} → {r.destination_ip} ({r.protocol})
          </div>
        ))}
        {records.length === 0 && (
          <p className="text-sm text-text-faint">No records yet.</p>
        )}
      </div>
    </div>
  </div>;
}
