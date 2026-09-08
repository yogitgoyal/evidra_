"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileOutput, Download, Loader2 } from "lucide-react";
import { downloadReport, getReport } from "@/lib/api";
import { Card, Button, SectionLabel } from "@/components/ui/primitives";

export default function ReportGeneratorPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    getReport(caseId).then(setReport).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [caseId]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const blob = await downloadReport(caseId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `case-${caseId}-report.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download the report PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div className="flex items-center gap-2"><FileOutput size={16} className="text-cyan" /><h1 className="text-xl font-semibold text-text">Report Generator</h1></div>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between"><SectionLabel>LIVE REPORT PREVIEW</SectionLabel><Button onClick={downloadPdf} disabled={!report || downloading}>{downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF</Button></div>
        {loading ? <p className="text-sm text-text-dim">Generating report…</p> : report ? (
          <pre className="max-h-[680px] overflow-auto whitespace-pre-wrap rounded-xl border border-border-soft bg-bg-raised p-5 text-xs text-text-dim">{JSON.stringify(report, null, 2)}</pre>
        ) : <p className="text-sm text-text-dim">No report data was returned for this case.</p>}
      </Card>
    </div>
  );
}
