"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCase, deleteCase, CaseApiResponse, getGraph, getTimeline, getStory, getRiskFactors, getEvidence, getOverview, getCandidates, confirmCandidate, CandidatesResponse, RiskFactor } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Entity, StoryClaim, TimelineEvent, EventWindowActivity } from "@/lib/types";
import { CaseHeader } from "@/components/case/CaseHeader";
import { StoryMode } from "@/components/case/StoryMode";
import { RiskRadarChart } from "@/components/case/RiskRadarChart";
import { EntityIcon, entityTypeLabel } from "@/components/case/EntityIcon";
import { Card, SectionLabel } from "@/components/ui/primitives";
import { confidenceLabel, riskColor } from "@/lib/utils";
import { Cite } from "@/components/evidence/Cite";
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
  const [eventWindowActivity, setEventWindowActivity] = useState<EventWindowActivity[]>([]);
  const [riskFactorsLoading, setRiskFactorsLoading] = useState(true);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [confirmingCandidate, setConfirmingCandidate] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    setError("");
    setRiskFactorsLoading(true);
    Promise.all([getCase(caseId), getGraph(caseId), getTimeline(caseId), getStory(caseId), getRiskFactors(caseId), getEvidence(caseId), getOverview(caseId)])
      .then(([nextCase, graph, nextTimeline, story, nextRiskFactors, evidence, overview]) => {
        setRealCase(nextCase);
        setCaseEntities(graph.entities);
        setCaseEdges(graph.edges);
        setCaseTimeline(nextTimeline);
        setCaseClaims(story.claims);
        setRiskFactors(nextRiskFactors.riskFactors);
        setEvidenceCount(evidence.evidence.length);
        setEventWindowActivity(overview.event_window_activity ?? []);
        if (nextCase.clue_type && nextCase.clue_value) {
          setCandidatesLoading(true);
          getCandidates(caseId).then(setCandidates).catch((err: Error) => setCandidateError(err.message)).finally(() => setCandidatesLoading(false));
        } else {
          setCandidates(null);
        }
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

  async function handleConfirmCandidate(candidateId: string) {
    setConfirmingCandidate(candidateId);
    setCandidateError("");
    try {
      await confirmCandidate(caseId, candidateId);
      const [nextCase, nextCandidates] = await Promise.all([getCase(caseId), getCandidates(caseId)]);
      setRealCase(nextCase);
      setCandidates(nextCandidates);
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : "Failed to confirm candidate.");
    } finally {
      setConfirmingCandidate(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
      {/* Case Header */}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <CaseHeader c={caseData} />
      {realCase?.investigation_mode === "evidence" && (realCase.evidence_types?.length ?? 0) > 1 && (
        <div className="rounded-xl border border-border-soft bg-surface px-4 py-3 text-sm text-text-dim">
          <span className="font-semibold text-text">Expected evidence:</span>{" "}
          {realCase.evidence_types?.join(", ")}
        </div>
      )}

      {realCase?.investigation_mode === "evidence" && realCase.clue_type && realCase.clue_value && (
        <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionLabel>CLUE CANDIDATES</SectionLabel>
              <div className="mt-2 text-sm text-text">{realCase.clue_type.replace("_", " ")}: <span className="font-mono text-cyan">{realCase.clue_value}</span></div>
            </div>
            {realCase.seed_value && <Link href={`/case/${caseId}/graph`} className="rounded-lg border border-cyan/30 bg-cyan-dim px-3 py-2 text-xs font-medium text-cyan hover:border-cyan/50">Starting entity: {realCase.seed_value}</Link>}
          </div>
          {candidateError && <p role="alert" className="mb-3 text-sm text-red-500">{candidateError}</p>}
          {candidatesLoading ? <p className="text-sm text-text-dim">Searching case evidence for candidates…</p> : candidates?.candidates.length ? (
            <div className="space-y-3">
              {candidates.candidates.map((candidate) => (
                <div key={candidate.entity.id} className="rounded-lg border border-border-soft bg-surface-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text"><span>{candidate.entity.label}</span><span className="rounded-md bg-cyan-dim px-1.5 py-0.5 text-[10px] uppercase text-cyan">{candidate.entity.type}</span><span className="font-mono text-xs text-text-faint">score {candidate.score}</span></div>
                      <div className="mt-1 text-xs text-text-dim">{candidate.matching_record_ids.length} matching record{candidate.matching_record_ids.length === 1 ? "" : "s"}</div>
                    </div>
                    <button type="button" onClick={() => void handleConfirmCandidate(candidate.entity.id)} disabled={confirmingCandidate !== null} className="rounded-lg bg-cyan px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{confirmingCandidate === candidate.entity.id ? "Confirming…" : realCase.seed_value === candidate.entity.value ? "Confirmed" : "Confirm"}</button>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-text-dim">{candidate.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                  {candidate.matching_evidence_ids.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-text-faint"><span>Evidence:</span><Cite ids={candidate.matching_evidence_ids} chipKey={`candidate-${candidate.entity.id}`} /></div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-soft bg-surface-2 p-4 text-sm text-text-dim">
              <p>{candidates?.reason ?? "No matching evidence has been ingested yet."}</p>
              <p className="mt-2">Upload evidence, then return here to refresh candidates.</p>
              <div className="mt-3 flex flex-wrap gap-2">{[["CDR", "data"], ["Banking", "banking"], ["IPDR", "ipdr"], ["Social", "social"], ["Identity", "identity"]].map(([label, path]) => <Link key={path} href={`/case/${caseId}/${path}`} className="rounded-md border border-border-soft bg-surface px-2.5 py-1.5 text-xs text-text-dim hover:border-cyan/40 hover:text-cyan">Upload {label}</Link>)}</div>
              {(realCase.clue_type === "transaction_id" || realCase.clue_type === "upi_ref") && <p className="mt-3 text-xs text-text-faint">Transaction IDs and UPI references require a banking CSV with the matching columns.</p>}
            </div>
          )}
        </Card>
      )}

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
          {eventWindowActivity.length > 0 && (
            <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="p-6">
              <SectionLabel className="mb-4">Most active in window</SectionLabel>
              <div className="space-y-3">
                {eventWindowActivity.map((item) => (
                  <div key={item.entityId} className="rounded-lg border border-border-soft bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-text">{item.label}</span>
                      <span className="font-mono text-cyan">{item.count}</span>
                    </div>
                    <div className="mt-1 text-[10.5px] leading-relaxed text-text-faint">{item.reason}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

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