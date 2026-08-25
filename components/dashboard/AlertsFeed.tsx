"use client";

import { Card, Badge } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { alerts } from "@/lib/data";
import { motion } from "framer-motion";
import { MoreVertical, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const sevTone: Record<string, "red" | "amber" | "cyan"> = {
  high: "red",
  watch: "amber",
  info: "cyan",
};

export function AlertsFeed() {
  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-text">Live alert feed</h3>
          <span className="pulse-ring relative h-2 w-2 rounded-full bg-red text-red" />
        </div>
        <Link href="/case/2047/evidence" className="flex items-center gap-0.5 text-xs font-semibold text-cyan hover:underline">
          View all <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="space-y-2">
        {alerts.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.35 }}
            className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
          >
            <Badge tone={sevTone[a.severity]} className="mt-0.5 shrink-0 font-mono text-[10px] uppercase font-bold px-2 py-0.5">
              {a.severity}
            </Badge>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-text">
                {a.title}
                {a.evidenceIds.length > 0 && <Cite ids={a.evidenceIds} chipKey={a.id} />}
              </p>

              <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-mono text-text-faint uppercase tracking-wider">
                <div className="flex items-center gap-1.5 truncate">
                  <span>{a.rule}</span>
                  <span>·</span>
                  <span>Case #{a.caseId}</span>
                </div>
                <span className="shrink-0 text-text-faint">{a.time}</span>
              </div>
            </div>

            <button className="shrink-0 rounded-lg p-1 text-text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-text-dim">
              <MoreVertical size={15} />
            </button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
