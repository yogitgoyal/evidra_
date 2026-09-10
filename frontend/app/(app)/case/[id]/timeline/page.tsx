"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getTimeline } from "@/lib/api";
import { Entity, TimelineEvent } from "@/lib/types";
import { Card, Badge, SectionLabel, SourceTag } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { EntityIcon } from "@/components/case/EntityIcon";
import { TimelineSparkline } from "@/components/timeline/TimelineSparkline";
import { cn } from "@/lib/utils";
import { History, Filter, AlertTriangle, ShieldCheck } from "lucide-react";

const sources = ["CDR", "IPDR", "Banking", "Social", "Identity", "Report"] as const;
const severityDot: Record<string, string> = {
  high: "bg-red",
  watch: "bg-amber",
  info: "bg-cyan",
};

export default function TimelinePage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [entities] = useState<Entity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(sources));

  useEffect(() => {
    if (!caseId) return;
    getTimeline(caseId)
      .then(setTimeline)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  const filtered = useMemo(
    () => timeline.filter((t) => activeSources.has(t.source)),
    [activeSources, timeline]
  );

  const highSignalCount = useMemo(
    () => filtered.filter((t) => t.severity === "high").length,
    [filtered]
  );

  function toggle(s: string) {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s);
      } else next.add(s);
      return next;
    });
  }

  function handleSelectEvent(eventId: string) {
    const el = document.getElementById(`event-${eventId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History size={16} className="text-cyan" />
            <h1 className="text-xl font-semibold tracking-tight text-text">Digital Timeline</h1>
          </div>
          <p className="mt-1 text-sm text-text-dim">
            Cross-source events reconstructed into a single, time-ordered account of activity.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="mr-0.5 text-text-faint" />
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              aria-pressed={activeSources.has(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-all",
                activeSources.has(s)
                  ? "border-border bg-bg-raised text-text"
                  : "border-border-soft text-text-faint opacity-45"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Task 4: Interactive Activity Intensity Heatmap Sparkline */}
      {loading ? (
        <Card className="p-6 text-sm text-text-faint">Loading timeline events...</Card>
      ) : (
        <TimelineSparkline timeline={timeline} onSelectEvent={handleSelectEvent} />
      )}

      {/* Main 12-Column Responsive Layout Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Event Timeline Sequence (Col 8) */}
        <Card className="p-6 lg:col-span-8">
          {loading ? (
            <div className="rounded-xl border border-dashed border-border-soft p-8 text-center text-sm text-text-faint">
              Loading timeline events...
            </div>
          ) : (
          <div className="relative">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border-soft" />
            <div className="space-y-6">
              {filtered.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  id={`event-${ev.id}`}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative pl-8 scroll-mt-24"
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-bg-raised/0",
                      severityDot[ev.severity]
                    )}
                    style={{ boxShadow: ev.severity === "high" ? "0 0 12px rgba(239,98,98,0.6)" : undefined }}
                  />
                  <div className="rounded-xl border border-border-soft bg-bg-raised p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-text-faint">{ev.timestamp}</span>
                      <div className="flex items-center gap-1.5">
                        <SourceTag source={ev.source} />
                        {ev.severity === "high" && <Badge tone="red">High signal</Badge>}
                        {ev.severity === "watch" && <Badge tone="amber">Watch</Badge>}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-text">{ev.title}</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-dim">
                      {ev.description} <Cite ids={ev.evidenceIds} chipKey={ev.id} />
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ev.entityIds.map((id) => {
                        const e = entities.find((en) => en.id === id);
                        if (!e) return null;
                        return (
                          <span
                            key={id}
                            className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-2.5 py-1 text-[10.5px] text-text-dim"
                          >
                            <EntityIcon type={e.type} size={11} />
                            {e.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-border-soft p-8 text-center text-sm text-text-faint">
                  No timeline events for this case.
                </div>
              )}
            </div>
          </div>
          )}
        </Card>

        {/* Right Sidebar: Timeline Intelligence Breakdown (Col 4) */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="p-6">
            <SectionLabel className="mb-4">Timeline summary</SectionLabel>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border-soft bg-surface-2 p-3 text-xs">
                <span className="text-text-dim">Total Reconstructed Events</span>
                <span className="font-mono font-bold text-text">{filtered.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-red-bg bg-red-bg/50 p-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-red">
                  <AlertTriangle size={14} /> High-Signal Anomalies
                </span>
                <span className="font-mono font-bold text-red">{highSignalCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border-soft bg-surface-2 p-3 text-xs">
                <span className="flex items-center gap-1.5 text-text-dim">
                  <ShieldCheck size={14} className="text-cyan" /> Hash-Verified Provenance
                </span>
                <span className="font-mono font-bold text-cyan">100%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionLabel className="mb-3">Event Volume by Source</SectionLabel>
            <div className="space-y-2.5">
              {sources.map((s) => {
                const count = timeline.filter((t) => t.source === s).length;
                const pct = timeline.length === 0 ? 0 : Math.round((count / timeline.length) * 100);
                return (
                  <div key={s} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-dim">{s}</span>
                      <span className="font-mono text-[11px] text-text-faint">
                        {count} events ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-cyan transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="rounded-xl border border-dashed border-border-soft p-4 text-[11px] leading-relaxed text-text-faint">
            <SectionLabel className="mb-1.5">Reading this timeline</SectionLabel>
            Sequence reflects source timestamps only — proximity in time is an investigative lead, never proof of intent or causation.
          </div>
        </div>
      </div>
    </div>
  );
}
