"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCase, deleteCase, CaseApiResponse, getGraph, getTimeline, getStory, getRiskFactors, getEvidence, RiskFactor } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Entity, StoryClaim, TimelineEvent } from "@/lib/types";
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

const getQuickLinks = (entityCount: number, edgeCount: number, timelineCount: number, evidenceCount: number) => [
  { href: "graph", icon: GitFork, label: "Investigation Graph", desc: `${entityCount} entities · ${edgeCount} relationships` },
  { href: "timeline", icon: History, label: "Digital Timeline", desc: `${timelineCount} reconstructed events` },
  { href: "financial", icon: Landmark, label: "Financial Flow", desc: "Live banking relationships" },
  { href: "map", icon: MapPinned, label: "Geospatial View", desc: "Live source coordinates" },
  { href: "copilot", icon: BotMessageSquare, label: "AI Copilot", desc: "Grounded natural-language queries" },
  { href: "evidence", icon: FileSearch, label: "Evidence Viewer", desc: `${evidenceCount} source records` },
  { href: "report", icon: FileOutput, label: "Report Generator", desc: "Export court-ready PDF" },
];

export default function CaseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;
  const [realCase, setRealCase] = useState<CaseApiResponse | null>(null);
  const [caseEntities, setCaseEntities] = useState<Entity[]>([]);
  const [caseEdges, setCaseEdges] = useState<import("@/lib/types").GraphEdge[]>([]);
  const [caseTimeline, setCaseTimeline] = useState<TimelineEvent[]>([]);
  const [caseClaims, setCaseClaims] = useState<StoryClaim[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [riskFactorsLoading, setRiskFactorsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    setError("");
    setRiskFactorsLoading(true);
    Promise.all([getCase(caseId), getGraph(caseId), getTimeline(caseId), getStory(caseId), getRiskFactors(caseId), getEvidence(caseId)])
      .then(([nextCase, graph, nextTimeline, story, nextRiskFactors, evidence]) => {
        setRealCase(nextCase);
        setCaseEntities(graph.entities);
        setCaseEdges(graph.edges);
        setCaseTimeline(nextTimeline);
        setCaseClaims(story.claims);
        setRiskFactors(nextRiskFactors.riskFactors);
        setEvidenceCount(evidence.evidence.length);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setRiskFactorsLoading(false));
  }, [caseId]);

  const c = realCase
    ? {
        id: realCase.id,
        title: realCase.title ?? realCase.name,
        opened: realCase.opened ?? realCase.created_at.split("T")[0],
        status: realCase.status ?? "active",
        priority: realCase.priority ?? "medium",
        lead: realCase.lead ?? "Unassigned",
        entities: realCase.entities ?? caseEntities.length,
        alerts: realCase.alerts ?? 0,
        riskScore: realCase.riskScore ?? 0,
        tags: realCase.tags ?? [],
      }
    : null;

  const topEntities = [...caseEntities].sort((a, b) => b.risk - a.risk).slice(0, 6);
  const recentEvents = caseTimeline.slice(0, 4);

  if (!c && !error) {
    return <div className="p-8 text-sm text-text-dim">Loading case…</div>;
  }
  if (!c) {
    return <div role="alert" className="p-8 text-sm text-red-500">{error}</div>;
  }
  const caseData = c;

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${caseData.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteCase(caseId);
      router.push("/dashboard");
    } catch {
      alert("Failed to delete case. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
      {/* Case Header */}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <CaseHeader c={caseData} />

      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
        >
          Delete Case
        </button>
      </div>

      {/* Task 3: Risk Factor Radar Chart */}
      <RiskRadarChart riskScore={caseData.riskScore} factors={riskFactors} loading={riskFactorsLoading} />

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {getQuickLinks(caseEntities.length, caseEdges.length, caseTimeline.length, evidenceCount).map((q, i) => (
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
          <StoryMode claims={caseClaims} />
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