"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Landmark } from "lucide-react";
import { getFinancial } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";

export default function FinancialFlowPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [flow, setFlow] = useState<Awaited<ReturnType<typeof getFinancial>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    getFinancial(caseId).then(setFlow).catch((err: Error) => setError(err.message));
  }, [caseId]);

  const transactions = flow?.flows ?? [];
  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div>
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-cyan" />
          <h1 className="text-xl font-semibold tracking-tight text-text">Financial Flow</h1>
        </div>
        <p className="mt-1 text-sm text-text-dim">Live money movement derived from this case&apos;s banking records.</p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card className="p-6">
        <SectionLabel className="mb-4">LIVE FINANCIAL FLOW</SectionLabel>
        {!flow ? <p className="text-sm text-text-dim">Loading banking records…</p> : flow.links.length === 0 ? (
          <p className="text-sm text-text-dim">No banking records for this case.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {flow.links.map((link) => (
              <div key={`${link.source}-${link.target}-${link.value}`} className="rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm">
                {link.source} → {link.target}: ₹{link.value.toLocaleString("en-IN")}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>TRANSACTION LEDGER</SectionLabel>
          <span className="font-mono text-xs text-text-faint">{transactions.length} banking records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead><tr className="border-b border-border-soft text-[10.5px] uppercase tracking-wider text-text-faint">
              <th className="pb-2.5 pr-4">From</th><th className="pb-2.5 pr-4">To</th><th className="pb-2.5 pr-4">Amount</th><th className="pb-2.5 pr-4">Channel</th><th className="pb-2.5">Evidence</th>
            </tr></thead>
            <tbody>{transactions.map((transaction, index) => (
              <tr key={`${transaction.evidenceId ?? "transaction"}-${index}`} className="border-b border-border-soft/60">
                <td className="py-2.5 pr-4 font-mono text-text-dim">{String(transaction.from)}</td>
                <td className="py-2.5 pr-4 font-mono text-text-dim">{String(transaction.to)}</td>
                <td className="py-2.5 pr-4 font-mono font-semibold text-text">₹{Number(transaction.amount).toLocaleString("en-IN")}</td>
                <td className="py-2.5 pr-4 text-text-dim">{String(transaction.channel)}</td>
                <td className="py-2.5 font-mono text-text-faint">{String(transaction.evidenceId ?? "—")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
