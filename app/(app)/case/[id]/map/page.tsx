"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { entities, edges } from "@/lib/data";
import { Card, Badge, SectionLabel } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { EntityIcon } from "@/components/case/EntityIcon";
import { MapPinned, RadioTower } from "lucide-react";

// Synthetic tactical coordinates (Sector 18 area, plotted on a stylized grid — not real GPS)
const towerPositions: Record<string, { x: number; y: number }> = {
  tw1: { x: 260, y: 200 },
  tw2: { x: 560, y: 340 },
};

const coOccurrences = [
  { towerId: "tw1", entityId: "ph1", label: "Unknown Subject A", occurrences: 3 },
  { towerId: "tw1", entityId: "ph3", label: "K. Sethi", occurrences: 5 },
  { towerId: "tw2", entityId: "ph2", label: "R. Malhotra", occurrences: 1 },
];

export default function GeospatialPage() {
  const [activeTower, setActiveTower] = useState<string | null>("tw1");
  const towers = entities.filter((e) => e.type === "tower");
  const locEdges = edges.filter((e) => e.kind === "LOCATED_AT");

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div>
        <div className="flex items-center gap-2">
          <MapPinned size={16} className="text-cyan" />
          <h1 className="text-xl font-semibold tracking-tight text-text">Geospatial View</h1>
        </div>
        <p className="mt-1 text-sm text-text-dim">
          Cell-sector co-occurrence — a synthetic tactical rendering, not GPS-precise. Complements Pratibimb&apos;s
          national infrastructure mapping at case level.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="scan-sweep relative overflow-hidden p-0 lg:col-span-2">
          <div className="bg-command relative h-[460px] w-full">
            <svg viewBox="0 0 820 460" className="h-full w-full">
              <defs>
                <radialGradient id="towerGlow" r="60%">
                  <stop offset="0%" stopColor="#3DD6D0" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3DD6D0" stopOpacity="0" />
                </radialGradient>
              </defs>

              {towers.map((t) => {
                const pos = towerPositions[t.id];
                if (!pos) return null;
                const active = activeTower === t.id;
                return (
                  <g key={t.id} onClick={() => setActiveTower(t.id)} className="cursor-pointer">
                    <circle cx={pos.x} cy={pos.y} r={90} fill="url(#towerGlow)" opacity={active ? 1 : 0.4} />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={active ? 70 : 55}
                      fill="none"
                      stroke={active ? "#3DD6D0" : "#232E47"}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                    <circle cx={pos.x} cy={pos.y} r={7} fill="#0B1020" stroke="#3DD6D0" strokeWidth={2} />
                    <foreignObject x={pos.x - 8} y={pos.y - 8} width={16} height={16}>
                      <RadioTower size={16} color="#3DD6D0" />
                    </foreignObject>
                    <text x={pos.x} y={pos.y + 34} textAnchor="middle" fill="#93A0BD" fontSize={11} fontFamily="JetBrains Mono, monospace">
                      {t.label}
                    </text>
                    <text x={pos.x} y={pos.y + 48} textAnchor="middle" fill="#5D6A8A" fontSize={9.5}>
                      {t.sublabel}
                    </text>
                  </g>
                );
              })}

              {activeTower &&
                coOccurrences
                  .filter((c) => c.towerId === activeTower)
                  .map((c, i) => {
                    const base = towerPositions[activeTower];
                    const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
                    const px = base.x + Math.cos(angle) * 130;
                    const py = base.y + Math.sin(angle) * 130;
                    return (
                      <g key={c.entityId}>
                        <motion.line
                          x1={base.x}
                          y1={base.y}
                          x2={px}
                          y2={py}
                          stroke="#3DD6D0"
                          strokeWidth={1.2}
                          className="evidence-trace"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.6 }}
                        />
                        <motion.circle
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.15 + i * 0.1 }}
                          cx={px}
                          cy={py}
                          r={5}
                          fill="#8B7FF2"
                        />
                        <text x={px} y={py - 12} textAnchor="middle" fill="#E8EEF8" fontSize={10.5} fontFamily="JetBrains Mono, monospace">
                          {c.label}
                        </text>
                      </g>
                    );
                  })}
            </svg>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionLabel className="mb-3">Towers in case</SectionLabel>
            <div className="space-y-2">
              {towers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTower(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    activeTower === t.id ? "border-cyan/50 bg-cyan/5" : "border-border-soft bg-bg-raised hover:border-border"
                  }`}
                >
                  <RadioTower size={14} className="shrink-0 text-cyan" />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] text-text">{t.label}</div>
                    <div className="truncate text-[10.5px] text-text-faint">{t.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionLabel className="mb-3">Co-occurrence evidence</SectionLabel>
            <div className="space-y-2.5">
              {locEdges.map((e) => {
                const entity = entities.find((en) => en.id === e.source);
                const tower = entities.find((en) => en.id === e.target);
                if (!entity || !tower) return null;
                return (
                  <div key={e.id} className="rounded-lg border border-border-soft bg-bg-raised px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-text">
                      <EntityIcon type={entity.type} size={12} />
                      {entity.label}
                      <span className="text-text-faint">at</span>
                      {tower.label}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Badge tone={e.confidence === "high" ? "green" : "amber"}>{e.confidence}</Badge>
                      <Cite ids={e.evidenceIds} chipKey={e.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border-soft px-4 py-3 text-[11px] leading-relaxed text-text-faint">
        CDR location is cell-sector granularity, not GPS — treat proximity as an investigative lead. Source records:{" "}
        <Cite ids={locEdges.flatMap((e) => e.evidenceIds)} chipKey="map-footer" />
      </div>
    </div>
  );
}
