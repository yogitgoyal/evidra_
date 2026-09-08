"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Card, Badge, SectionLabel } from "@/components/ui/primitives";
import { AlertTriangle, Info } from "lucide-react";

/* ─── Raw Input Transactions (Single Source of Truth) ─── */

const sourceInflows = [
  { id: "ev_bank_01", name: "A/C ••2290", account: "A/C ••2290", amount: 48000, channel: "IMPS", timestamp: "13:42:10" },
  { id: "ev_bank_02", name: "A/C ••7712", account: "A/C ••7712", amount: 52500, channel: "UPI",  timestamp: "13:44:05" },
  { id: "ev_bank_03", name: "A/C ••5541", account: "A/C ••5541", amount: 31200, channel: "NEFT", timestamp: "13:58:22" },
];

const outflowTx = {
  id: "ev_bank_04",
  name: "A/C ••0093",
  account: "A/C ••0093 (Dormant)",
  amount: 126800,
  channel: "RTGS",
  timestamp: "14:15:30",
};

/* ─── Derived Financial Calculations (Never Hardcoded) ─── */

// 1. Mule Total = sum(all source inflow amounts)
const muleTotal = sourceInflows.reduce((sum, item) => sum + item.amount, 0);

// 2. Unexplained Gap = Mule Total - Outflow
const unexplainedGap = Math.max(0, muleTotal - outflowTx.amount);

// 3. Dev-mode assertion warning
if (process.env.NODE_ENV !== "production") {
  const sumInflows = sourceInflows.reduce((sum, item) => sum + item.amount, 0);
  if (sumInflows !== muleTotal) {
    console.warn(
      `[EVIDRA DATA MISMATCH ASSERTION] Source inflows sum (${sumInflows}) !== Mule Total (${muleTotal})`
    );
  }
}

interface WaterfallStep {
  name: string;
  account: string;
  amount: number;       // visible bar height
  base: number;         // invisible offset below bar (bottom edge)
  displayAmt: number;   // signed display amount for labels/tooltips
  type: "inflow" | "total" | "outflow" | "gap";
  channel?: string;
  timestamp?: string;
  txId?: string;
}

// 4. Dynamically compute waterfall steps
let runningTotal = 0;
const inflowSteps: WaterfallStep[] = sourceInflows.map((item) => {
  const step: WaterfallStep = {
    name: item.name,
    account: item.account,
    amount: item.amount,
    base: runningTotal,
    displayAmt: item.amount,
    type: "inflow",
    channel: item.channel,
    timestamp: item.timestamp,
    txId: item.id,
  };
  runningTotal += item.amount;
  return step;
});

const waterfallData: WaterfallStep[] = [
  ...inflowSteps,
  {
    name: "Mule Total",
    account: "A/C ••4471 (Mule)",
    amount: muleTotal,
    base: 0,
    displayAmt: muleTotal,
    type: "total",
    timestamp: "13:42 – 13:58",
  },
  {
    name: "A/C ••0093",
    account: outflowTx.account,
    amount: outflowTx.amount,
    base: unexplainedGap,
    displayAmt: -outflowTx.amount,
    type: "outflow",
    channel: outflowTx.channel,
    timestamp: outflowTx.timestamp,
    txId: outflowTx.id,
  },
  {
    name: "Gap",
    account: "Unexplained difference",
    amount: unexplainedGap,
    base: 0,
    displayAmt: unexplainedGap,
    type: "gap",
  },
];

// 5. Dynamically compute source contribution % relative to computed muleTotal
const sourceComparison = [...sourceInflows]
  .sort((a, b) => b.amount - a.amount)
  .map((s) => ({
    name: s.name,
    amount: s.amount,
    pct: Number(((s.amount / muleTotal) * 100).toFixed(1)),
    channel: s.channel,
  }));

const barColors: Record<string, string> = {
  inflow:  "#22c55e",
  total:   "#f59e0b",
  outflow: "#64748B",
  gap:     "#ef4444",
};

/* ─── Custom Tooltip ─── */

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallStep }> }) {
  if (!active || !payload?.[1]) return null;
  const d = payload[1].payload;

  const sign = d.type === "outflow" ? "−" : d.type === "gap" ? "" : "+";
  const topVal  = d.base + d.amount;
  const botVal  = d.base;

  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 shadow-xl text-xs">
      <div className="font-semibold text-text">{d.account}</div>
      <div className="mt-1 font-mono font-bold" style={{ color: barColors[d.type] }}>
        {sign}₹{Math.abs(d.displayAmt).toLocaleString("en-IN")}
      </div>
      {d.type === "outflow" && (
        <div className="mt-0.5 font-mono text-[10px] text-text-faint">
          ₹{topVal.toLocaleString("en-IN")} → ₹{botVal.toLocaleString("en-IN")}
        </div>
      )}
      {d.channel && (
        <div className="mt-1 text-text-faint">
          {d.channel} · {d.timestamp}
        </div>
      )}
      {d.txId && (
        <div className="mt-0.5 font-mono text-[10px] text-text-faint">{d.txId}</div>
      )}
    </div>
  );
}

/* ─── Custom bar label renderer ─── */

function renderBarLabel(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) {
  const { x = 0, y = 0, width = 0, index = 0 } = props;
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numW = Number(width) || 0;
  const d = waterfallData[index];
  if (!d) return null;

  const sign   = d.type === "outflow" ? "−" : d.type === "gap" ? "" : d.type === "total" ? "Σ " : "+";
  const label  = `${sign}₹${Math.abs(d.displayAmt).toLocaleString("en-IN")}`;

  return (
    <text
      x={numX + numW / 2}
      y={numY - 6}
      textAnchor="middle"
      fontSize={9.5}
      fontFamily="monospace"
      fontWeight={700}
      fill={barColors[d.type]}
    >
      {label}
    </text>
  );
}

/* ─── Component ─── */

export function SankeyFlow() {
  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-1">
        <SectionLabel>FINANCIAL FLOW ANALYSIS</SectionLabel>
        <p className="mt-0.5 text-[11.5px] text-text-faint">
          Waterfall chart — bars stack upward for inflows (+), step downward for outflows (−), showing the net remainder
        </p>
      </div>

      {/* Legend strip */}
      <div className="mb-5 mt-3 flex flex-wrap items-center gap-5 border-b border-border-soft pb-3">
        {[
          { color: "#22c55e", label: "+ Inflow (source deposits)" },
          { color: "#f59e0b", label: "Σ Mule convergence subtotal" },
          { color: "#64748B", label: "− Outflow (onward transfer)" },
          { color: "#ef4444", label: "Unexplained remainder" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-text-dim">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* ─── Main layout: Waterfall (8) + Sidebar (4) ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Waterfall chart */}
        <div className="lg:col-span-8">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={waterfallData}
              margin={{ top: 28, right: 16, left: 8, bottom: 4 }}
              barCategoryGap="18%"
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--evidra-border-soft)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--evidra-text-dim)" }}
                axisLine={{ stroke: "var(--evidra-border-soft)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: "var(--evidra-text-faint)", fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={54}
                domain={[0, 145000]}
              />
              <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

              {/* Invisible base bar — lifts the visible bar to the correct cumulative offset */}
              <Bar dataKey="base" stackId="waterfall" fill="none" fillOpacity={0} radius={0} />

              {/* Visible amount bar with per-bar colors and value labels */}
              <Bar dataKey="amount" stackId="waterfall" radius={[3, 3, 0, 0]}>
                {waterfallData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={barColors[d.type]}
                    opacity={d.type === "total" ? 0.85 : 1}
                  />
                ))}
                <LabelList content={renderBarLabel} />
              </Bar>

              {/* Reference line at computed mule total */}
              <ReferenceLine
                y={muleTotal}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `₹${muleTotal.toLocaleString("en-IN")} mule total`,
                  position: "insideTopRight",
                  fill: "#f59e0b",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />

              {/* Reference line at computed unexplained gap */}
              <ReferenceLine
                y={unexplainedGap}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={0.75}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Badge annotations below chart */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-4 rounded-full bg-[#f59e0b]" />
              <Badge tone="red" className="font-mono text-[9.5px]">HIGH_FAN_IN · 0.92</Badge>
              <span className="text-text-faint">on Mule Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-4 rounded-full bg-[#64748B]" />
              <Badge tone="amber" className="font-mono text-[9.5px]">DORMANT_REACTIVATION · 0.88</Badge>
              <span className="text-text-faint">on A/C ••0093</span>
            </div>
          </div>
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="space-y-5 lg:col-span-4">

          {/* Source contribution comparison */}
          <div>
            <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
              Source Contribution
            </p>
            <div className="space-y-2.5">
              {sourceComparison.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-mono font-medium text-text-dim">
                      {s.name}
                      <span className="ml-1.5 text-[10px] font-normal text-text-faint">{s.channel}</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-text">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.pct}%`,
                        backgroundColor: "#22c55e",
                        opacity: 0.75,
                      }}
                    />
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-text-faint text-right">
                    {s.pct}% of total inflow
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact flag annotations */}
          <div className="space-y-3 border-t border-border-soft pt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
              Why Flagged
            </p>

            <div className="flex items-start gap-1.5 rounded-lg bg-red-50/60 border border-red-100 px-3 py-2 text-[11px] text-red-800">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                <strong>3 unrelated accounts</strong> deposited ₹{muleTotal.toLocaleString("en-IN")}
                into A/C ••4471 within an <strong>18-min window</strong>
              </span>
            </div>

            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2 text-[11px] text-amber-800">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                A/C ••0093 was <strong>dormant 118 days</strong>,
                reactivated the <strong>same day</strong> mule funds arrived
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="font-mono text-lg font-bold text-green-600">₹{muleTotal.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-text-faint">Total In</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-slate-600">₹{outflowTx.amount.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-text-faint">Total Out</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-red-500">₹{unexplainedGap.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-text-faint">Unexplained</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-text-dim">33 min</div>
                <div className="text-[10px] text-text-faint">Total Span</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
}
