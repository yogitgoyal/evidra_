"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { cases, entities, edges, evidence, storyClaims, timeline } from "@/lib/data";
import { CaseHeader } from "@/components/case/CaseHeader";
import { StoryMode } from "@/components/case/StoryMode";
import { RiskRadarChart } from "@/components/case/RiskRadarChart";
import { EntityIcon, entityTypeLabel } from "@/components/case/EntityIcon";
import { Card, SectionLabel } from "@/components/ui/primitives";
import { confidenceLabel, riskColor } from "@/lib/utils";
import {
  GitFork,
  History,
  Landmark,
  MapPinned,
  BotMessageSquare,
  FileSearch,
  FileOutput,
  ArrowUpRight,
} from "lucide-react";

const getQuickLinks = () => [
  { href: "graph", icon: GitFork, label: "Investigation Graph", desc: `${entities.length} entities · ${edges.length} relationships` },
  { href: "timeline", icon: History, label: "Digital Timeline", desc: `${timeline.length} reconstructed events` },
  { href: "financial", icon: Landmark, label: "Financial Flow", desc: "Fan-in / fan-out pattern" },
  { href: "map", icon: MapPinned, label: "Geospatial View", desc: "2 towers, 5 co-occurrences" },
  { href: "copilot", icon: BotMessageSquare, label: "AI Copilot", desc: "Grounded natural-language queries" },
  { href: "evidence", icon: FileSearch, label: "Evidence Viewer", desc: `${evidence.length} source records` },
  { href: "report", icon: FileOutput, label: "Report Generator", desc: "Export court-ready PDF" },
];

export default function CaseOverviewPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const c = cases.find((x) => x.id === caseId) ?? cases[0];

  const topEntities = [...entities].sort((a, b) => b.risk - a.risk).slice(0, 6);
  const recentEvents = timeline.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
      {/* Case Header */}
      <CaseHeader c={c} />

      {/* Task 3: Risk Factor Radar Chart */}
      <RiskRadarChart riskScore={c.riskScore} />

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {getQuickLinks().map((q, i) => (
          <motion.div
            key={q.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
          >
            <Link
              href={`/case/${caseId}/${q.href}`}
              className="group flex items-start gap-3 rounded-xl border border-border-soft bg-surface p-4 transition-all hover:border-cyan/40 hover:bg-surface-2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-dim text-cyan">
                <q.icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[13px] font-medium text-text">
                  {q.label}
                  <ArrowUpRight size={12} className="text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-0.5 text-[11px] text-text-faint">{q.desc}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StoryMode claims={storyClaims} />
        </div>

        <div className="space-y-6">
          <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="p-6">
            <SectionLabel className="mb-4">Highest-risk entities</SectionLabel>
            <div className="space-y-1">
              {topEntities.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <EntityIcon type={e.type} size={14} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-text">{e.label}</div>
                    <div className="truncate text-[10.5px] text-text-faint">{entityTypeLabel[e.type]} · {confidenceLabel(e.confidence)}</div>
                  </div>
                  <span className="font-mono text-xs font-semibold" style={{ color: riskColor(e.risk) }}>
                    {e.risk}
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>

          <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>Recent timeline</SectionLabel>
              <Link href={`/case/${caseId}/timeline`} className="text-[11px] text-cyan hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentEvents.map((ev) => (
                <div key={ev.id} className="relative border-l border-border-soft pl-4">
                  <span
                    className="absolute -left-[3.5px] top-1 h-[7px] w-[7px] rounded-full"
                    style={{ backgroundColor: ev.severity === "high" ? "var(--evidra-red)" : ev.severity === "watch" ? "var(--evidra-amber)" : "var(--evidra-cyan)" }}
                  />
                  <div className="font-mono text-[10px] text-text-faint">{ev.timestamp}</div>
                  <div className="mt-0.5 text-[12.5px] font-medium text-text">{ev.title}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
