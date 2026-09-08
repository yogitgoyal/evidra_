"use client";

import { Badge } from "@/components/ui/primitives";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { CaseSummary } from "@/lib/types";
import { motion } from "framer-motion";
import { Calendar, User, Layers } from "lucide-react";

const statusTone: Record<string, "cyan" | "amber" | "neutral"> = {
  active: "cyan",
  review: "amber",
  closed: "neutral",
};
const priorityTone: Record<string, "red" | "amber" | "cyan" | "neutral"> = {
  critical: "red",
  high: "amber",
  medium: "cyan",
  low: "neutral",
};

export function CaseHeader({ c }: { c: CaseSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6 rounded-2xl border border-border-soft bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[c.status]} className="capitalize">
            {c.status}
          </Badge>
          <Badge tone={priorityTone[c.priority]} className="capitalize">
            {c.priority} priority
          </Badge>
          {c.tags.map((t) => (
            <Badge key={t} className="font-mono">
              {t}
            </Badge>
          ))}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text">{c.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-text-faint" /> Opened {c.opened}
          </span>
          <span className="flex items-center gap-1.5">
            <User size={13} className="text-text-faint" /> Lead: {c.lead}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-text-faint" /> {c.entities} entities · {c.alerts} alerts
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 self-center">
        <RiskGauge value={c.riskScore} size={100} stroke={8} />
      </div>
    </motion.div>
  );
}
