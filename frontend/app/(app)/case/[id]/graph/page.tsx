"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { getGraph } from "@/lib/api";
import { Entity, EntityType, GraphEdge } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { EntityIcon, entityTypeLabel } from "@/components/case/EntityIcon";
import { entityColorMap2D } from "@/components/graph/InvestigationGraph";
import { cn, confidenceLabel, riskColor, riskLabel } from "@/lib/utils";
import { X, Waypoints, Info } from "lucide-react";

const InvestigationGraph = dynamic(
  () => import("@/components/graph/InvestigationGraph").then((m) => m.InvestigationGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-xs font-mono uppercase text-text-dim">
        Initializing 2D Force Engine…
      </div>
    ),
  }
);

export default function GraphPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [entities, setEntities] = useState<Entity[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allTypes = Array.from(new Set(entities.map((e) => e.type))) as EntityType[];
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(new Set(allTypes));

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    getGraph(caseId)
      .then((data) => {
        setEntities(data.entities);
        setEdges(data.edges);
        setActiveTypes(new Set(data.entities.map((e) => e.type)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  const relatedEdges = useMemo(
    () => (selected ? edges.filter((e) => e.source === selected.id || e.target === selected.id) : []),
    [selected]
  );

  function toggleType(t: EntityType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size > 1) next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full min-w-0 flex-col overflow-hidden bg-[#f8fafc]">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft bg-surface/90 px-6 py-3 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <Waypoints size={16} className="text-cyan" />
          <h1 className="text-sm font-bold text-text">Investigation Graph</h1>
          <span className="font-mono text-[11px] text-text-faint">
            {entities.length} entities · {edges.length} relationships
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-all select-none",
                activeTypes.has(t)
                  ? "border-border-soft bg-surface-2 text-text shadow-2xs"
                  : "border-transparent bg-transparent text-text-faint opacity-40 hover:opacity-70"
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entityColorMap2D[t]?.base ?? "#64748b" }}
              />
              {entityTypeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Viewport Container */}
      <div className="relative flex flex-1 w-full min-w-0 overflow-hidden">
        <div className="relative flex-1 w-full h-full min-w-0 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-text-dim">Loading graph…</div>
          ) : error ? (
            <div role="alert" className="p-6 text-sm text-red">{error}</div>
          ) : entities.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-text-dim">No graph records for this case.</div>
          ) : (
            <InvestigationGraph onSelect={setSelected} filterTypes={activeTypes} entities={entities} edges={edges} />
          )}
        </div>

        {/* Bottom-left Legend Glass Pill */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-4 rounded-xl border border-border-soft bg-surface/90 px-3.5 py-2.5 text-[11px] text-text-dim backdrop-blur-md shadow-md">
          <span className="flex items-center gap-2">
            <svg width="22" height="2">
              <line x1="0" y1="1" x2="22" y2="1" stroke="#475569" strokeWidth="2" />
            </svg>
            Observed Link
          </span>
          <span className="flex items-center gap-2">
            <svg width="22" height="2">
              <line x1="0" y1="1" x2="22" y2="1" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" />
            </svg>
            Derived Link
          </span>
          <span className="flex items-center gap-1.5 text-text-faint">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Outgoing (Upstream)
          </span>
          <span className="flex items-center gap-1.5 text-text-faint">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Incoming (Downstream)
          </span>
          <span className="flex items-center gap-2 text-text-faint">
            <Info size={12} className="text-cyan" /> Sphere size = Risk Score
          </span>
        </div>

        {/* Right Info Drawer */}
        <AnimatePresence>
          {selected && (
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 bottom-0 z-20 h-full w-full max-w-[360px] shrink-0 overflow-y-auto border-l border-border-soft bg-surface/95 text-text backdrop-blur-md shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-surface/95 px-5 py-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <EntityIcon type={selected.type} size={16} />
                  <span className="text-sm font-bold text-text">Entity Detail</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-text-faint">
                    {entityTypeLabel[selected.type]}
                  </div>
                  <div className="text-base font-bold text-text">{selected.label}</div>
                  {selected.sublabel && (
                    <div className="mt-0.5 text-xs text-text-dim">{selected.sublabel}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border-soft bg-surface-2 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint">
                      Risk score
                    </div>
                    <div
                      className="mt-1 font-mono text-xl font-bold"
                      style={{ color: riskColor(selected.risk) }}
                    >
                      {selected.risk}
                    </div>
                    <div className="text-[10.5px] text-text-dim">{riskLabel(selected.risk)}</div>
                  </div>
                  <div className="rounded-xl border border-border-soft bg-surface-2 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint">
                      Match confidence
                    </div>
                    <div className="mt-1.5">
                      <Badge
                        tone={
                          selected.confidence === "high"
                            ? "green"
                            : selected.confidence === "ambiguous"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {confidenceLabel(selected.confidence)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <Badge key={t} tone="violet" className="font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <div className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-text-faint">
                    Direct relationships ({relatedEdges.length})
                  </div>
                  <div className="space-y-2">
                    {relatedEdges.map((e) => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = entities.find((en) => en.id === otherId);
                      const direction = e.source === selected.id ? "→" : "←";
                      const isOutgoing = e.source === selected.id;
                      return (
                        <div
                          key={e.id}
                          className="rounded-xl border border-border-soft bg-surface-2 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-text">
                            <span className="font-mono text-[10.5px] font-semibold" style={{ color: isOutgoing ? "#ef4444" : "#22c55e" }}>
                              {e.kind}
                            </span>
                            <span className="text-text-faint">{direction}</span>
                            {other && <EntityIcon type={other.type} size={13} />}
                            <span className="truncate font-medium">{other?.label ?? otherId}</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10.5px] text-text-faint">
                              {e.confidence === "high" ? "Observed link" : "Derived link"}
                            </span>
                            <Cite ids={e.evidenceIds} chipKey={e.id} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
