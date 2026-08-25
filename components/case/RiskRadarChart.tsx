"use client";

import { Card, SectionLabel, Badge } from "@/components/ui/primitives";
import { TrendingUp } from "lucide-react";

interface RiskFactor {
  label: string;
  score: number;
}

const factors: RiskFactor[] = [
  { label: "Fan-in severity",        score: 92 },
  { label: "Dormant reactivation",   score: 85 },
  { label: "Location co-occurrence", score: 78 },
  { label: "Device sharing",         score: 64 },
  { label: "Coordinated messaging",  score: 45 },
];

// Severity thresholds — must match legend and bars exactly
function severityColor(score: number): string {
  if (score >= 80) return "#ef4444"; // red
  if (score >= 60) return "#f59e0b"; // amber/orange
  return "#2f5fe0";                  // blue (low)
}

const GRID_COLOR   = "#E2E6EE";
const SHAPE_FILL   = "rgba(100, 116, 139, 0.08)"; // neutral very-light fill
const SHAPE_STROKE = "#94A3B8";                    // neutral gray outline — dots carry all color

export function RiskRadarChart({ riskScore = 87 }: { riskScore?: number }) {
  const center     = 115;
  const radius     = 82;
  const numFactors = factors.length;

  function getCoordinates(index: number, score: number) {
    const angle = (Math.PI * 2 / numFactors) * index - Math.PI / 2;
    const r     = (score / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  }

  // 3 concentric rings at 33 / 66 / 100
  const gridLevels = [
    { pct: 0.33, label: "33" },
    { pct: 0.66, label: "66" },
    { pct: 1.00, label: "100" },
  ];

  const pointsString = factors
    .map((f, i) => {
      const { x, y } = getCoordinates(i, f.score);
      return `${x},${y}`;
    })
    .join(" ");

  function barColor(score: number) {
    if (score >= 80) return "var(--evidra-red)";
    if (score >= 60) return "var(--evidra-amber)";
    return "var(--evidra-cyan)";
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-text-dim" />
          <SectionLabel>RISK FACTOR BREAKDOWN</SectionLabel>
        </div>
        <Badge tone="red" className="font-mono">
          AGGREGATE SCORE {riskScore}/100
        </Badge>
      </div>

      {/* Caption */}
      <p className="mb-4 text-[11.5px] text-text-faint">
        Shape area shows overall risk exposure — the further a vertex extends, the higher that factor scores.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">

        {/* ── Pentagon Radar ── */}
        <div className="flex flex-col items-center gap-3">
          <svg width="230" height="230" className="overflow-visible select-none">

            {/* Grid rings with numeric tick labels */}
            {gridLevels.map(({ pct, label }, lvlIdx) => {
              const gridPoints = factors
                .map((_, i) => {
                  const { x, y } = getCoordinates(i, pct * 100);
                  return `${x},${y}`;
                })
                .join(" ");
              const tickX = center + 5;
              const tickY = center - pct * radius - 4;
              return (
                <g key={lvlIdx}>
                  <polygon
                    points={gridPoints}
                    fill="none"
                    stroke={GRID_COLOR}
                    strokeWidth={lvlIdx === 2 ? "1.3" : "0.85"}
                    strokeDasharray={lvlIdx === 2 ? "0" : "3 4"}
                  />
                  <text x={tickX} y={tickY} fontSize={8.5} fill={GRID_COLOR} fontFamily="monospace" textAnchor="start">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Axis spokes */}
            {factors.map((_, i) => {
              const { x, y } = getCoordinates(i, 100);
              return (
                <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={GRID_COLOR} strokeWidth="0.9" />
              );
            })}

            {/* Risk polygon — neutral gray outline, very light fill */}
            <polygon
              points={pointsString}
              fill={SHAPE_FILL}
              stroke={SHAPE_STROKE}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray="4 3"
            />

            {/* Vertex dots — colored by severity (this is the key change) */}
            {factors.map((f, i) => {
              const { x, y } = getCoordinates(i, f.score);
              const dotColor = severityColor(f.score);
              return (
                <g key={i}>
                  {/* White halo for contrast against any background */}
                  <circle cx={x} cy={y} r="6.5" fill="white" />
                  {/* Outer ring — full severity color */}
                  <circle cx={x} cy={y} r="5.5" fill={dotColor} opacity={0.25} />
                  {/* Inner solid dot — full severity color */}
                  <circle cx={x} cy={y} r="3.8" fill={dotColor} />
                </g>
              );
            })}
          </svg>

          {/* Scale / Legend strip */}
          <div className="w-full max-w-[200px]">
            <div className="mb-1 flex items-center justify-between text-[9.5px] font-medium text-text-faint">
              <span>Score 0–100</span>
              <span>Higher = more suspicious</span>
            </div>
            <div
              className="h-2 w-full rounded-full"
              style={{ background: "linear-gradient(to right, #2f5fe0, #f59e0b, #ef4444)" }}
            />
            <div className="mt-0.5 flex justify-between text-[9px] text-text-faint">
              <span>Low (&lt;60)</span>
              <span>Med (60–79)</span>
              <span>High (≥80)</span>
            </div>
          </div>
        </div>

        {/* ── Severity Factor Bars ── */}
        <div className="space-y-3.5">
          <p className="mb-1 text-[11px] font-semibold text-text-dim">
            ↳ Factor-level breakdown
          </p>

          {factors.map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-dim">{f.label}</span>
                <span className="font-mono text-[11px] font-bold" style={{ color: barColor(f.score) }}>
                  {f.score}/100
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${f.score}%`, backgroundColor: barColor(f.score) }}
                />
              </div>
            </div>
          ))}

          {/* Color legend for bars */}
          <div className="mt-3 flex items-center gap-4 border-t border-border-soft pt-3">
            <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              High ≥80
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Med 60–79
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              Low &lt;60
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
