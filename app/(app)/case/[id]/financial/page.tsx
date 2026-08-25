"use client";

import { motion } from "framer-motion";
import { evidence } from "@/lib/data";
import { Card, Badge, SectionLabel } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { SankeyFlow } from "@/components/financial/SankeyFlow";
import { Landmark, TrendingUp } from "lucide-react";

const txns = evidence.filter((e) => e.source === "Banking");

export default function FinancialFlowPage() {
  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div>
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-cyan" />
          <h1 className="text-xl font-semibold tracking-tight text-text">Financial Flow</h1>
        </div>
        <p className="mt-1 text-sm text-text-dim">
          Money-movement pattern around the flagged mule account — velocity, fan-in, and onward transfer.
        </p>
      </div>

      {/* Interactive Sankey Flow Diagram */}
      <SankeyFlow />

      {/* Transaction Ledger Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-cyan" />
            <SectionLabel>TRANSACTION LEDGER</SectionLabel>
          </div>
          <Badge tone="neutral" className="font-mono text-[10.5px]">
            {txns.length} banking records
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-border-soft text-[10.5px] uppercase tracking-wider text-text-faint">
                <th className="pb-2.5 pr-4 font-medium">Record</th>
                <th className="pb-2.5 pr-4 font-medium">From</th>
                <th className="pb-2.5 pr-4 font-medium">To</th>
                <th className="pb-2.5 pr-4 font-medium">Amount</th>
                <th className="pb-2.5 pr-4 font-medium">Channel</th>
                <th className="pb-2.5 pr-4 font-medium">Timestamp</th>
                <th className="pb-2.5 font-medium">Rule</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="border-b border-border-soft/60 last:border-0"
                >
                  <td className="py-2.5 pr-4">
                    <Cite ids={[t.id]} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-text-dim">{String(t.fields.from)}</td>
                  <td className="py-2.5 pr-4 font-mono text-text-dim">{String(t.fields.to)}</td>
                  <td className="py-2.5 pr-4 font-mono font-semibold text-text">
                    ₹{Number(t.fields.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 pr-4 text-text-dim">{String(t.fields.channel)}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-text-faint">{t.timestamp}</td>
                  <td className="py-2.5">
                    <Badge tone={t.ruleTriggered === "DORMANT_REACTIVATION" ? "amber" : "red"} className="font-mono">
                      {t.ruleTriggered}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
