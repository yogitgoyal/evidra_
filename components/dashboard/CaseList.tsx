"use client";

import Link from "next/link";
import { Card, Badge } from "@/components/ui/primitives";
import { cases } from "@/lib/data";
import { riskColor, riskTextClass, cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

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

export function CaseList() {
  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
        <h3 className="text-sm font-semibold text-text">Your cases</h3>
        <span className="text-xs text-text-faint">{cases.length} total</span>
      </div>
      <div className="divide-y divide-border-soft">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/case/${c.id}`}
            className="group flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13.5px] font-medium text-text">{c.title}</span>
                <ArrowUpRight size={13} className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-text-faint">
                <span>Opened {c.opened}</span>
                <span>·</span>
                <span>Lead: {c.lead}</span>
                <span>·</span>
                <span>{c.entities} entities</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex gap-1.5">
                {c.tags.slice(0, 2).map((t) => (
                  <Badge key={t} className="font-mono">
                    {t}
                  </Badge>
                ))}
              </div>
              <Badge tone={statusTone[c.status]} className="capitalize">
                {c.status}
              </Badge>
              <Badge tone={priorityTone[c.priority]} className="capitalize">
                {c.priority}
              </Badge>
              <div className="flex w-16 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-raised">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.riskScore}%`, backgroundColor: riskColor(c.riskScore) }}
                  />
                </div>
                <span className={cn("font-mono text-[11px]", riskTextClass(c.riskScore))}>{c.riskScore}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
