"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createReport, listReports, ReportRecord, uploadReport } from "@/lib/api";

export default function ReportsPage() {
  const caseId = useParams()?.id as string;
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      setReports(await listReports(caseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    }
  }

  useEffect(() => {
    if (caseId) loadReports();
  }, [caseId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rawText.trim() && !file) {
      setError("Paste report text or choose a PDF/DOCX file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (file) {
        await uploadReport(caseId, file, rawText);
      } else {
        await createReport(caseId, rawText);
      }
      setRawText("");
      setFile(null);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-text">FIR / Report Ingestion</h1>
        <p className="mt-1 text-sm text-text-faint">
          Paste unstructured text to extract reviewable evidence entities.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border-soft bg-surface p-6">
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Paste FIR or surveillance report text here..."
          rows={12}
          className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text outline-none focus:border-cyan/50"
        />
        <label className="block text-sm text-text">
          Or upload a PDF/DOCX file
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm"
          />
        </label>
        {file && (
          <p className="text-xs text-text-faint">
            Selected: {file.name}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Submit Report"}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
          Submitted reports ({reports.length})
        </h2>
        {reports.map((report) => (
          <article key={report.id} className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
            <p className="whitespace-pre-wrap text-sm text-text">{report.raw_text}</p>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
                Extracted entities
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.extracted_entities.map((entity) => (
                  <span
                    key={`${report.id}-${entity.type}-${entity.offset}`}
                    className="rounded-full border border-cyan/30 px-3 py-1 text-xs text-cyan"
                  >
                    {entity.type}: {entity.value} ({entity.confidence})
                  </span>
                ))}
                {report.extracted_entities.length === 0 && (
                  <span className="text-sm text-text-faint">No supported entities extracted.</span>
                )}
              </div>
            </div>
          </article>
        ))}
        {reports.length === 0 && <p className="text-sm text-text-faint">No reports submitted yet.</p>}
      </div>
    </div>
  );
}
