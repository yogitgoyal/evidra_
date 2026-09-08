"use client";

import { Card } from "@/components/ui/primitives";
import { weeklyActivity } from "@/lib/data";
import { ChevronDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TooltipPayloadItem {
  payload: {
    day: string;
    fullDate?: string;
    alerts: number;
    resolved: number;
  };
  dataKey: string;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const newAlerts = payload.find((p) => p.dataKey === "alerts")?.value ?? 0;
  const resolved = payload.find((p) => p.dataKey === "resolved")?.value ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-md">
      <div className="mb-1.5 font-mono text-[11px] font-bold text-text-dim">
        {data.fullDate || data.day}
      </div>
      <div className="space-y-1 text-xs font-semibold">
        <div className="flex items-center gap-2 text-red">
          <span className="h-2 w-2 rounded-full bg-red" />
          <span>New alerts: {newAlerts}</span>
        </div>
        <div className="flex items-center gap-2 text-cyan">
          <span className="h-2 w-2 rounded-full bg-cyan" />
          <span>Resolved: {resolved}</span>
        </div>
      </div>
    </div>
  );
}

export function ActivityChart({ data = weeklyActivity }: { data?: typeof weeklyActivity }) {
  return (
    <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="w-full min-w-0 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight text-text">Alert activity overview</h3>
          <p className="mt-0.5 text-xs text-text-dim">New incoming alerts vs. resolved investigation items.</p>
        </div>
        <button className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-dim transition-colors hover:bg-surface-2">
          <span>7D</span>
          <ChevronDown size={12} className="text-text-faint" />
        </button>
      </div>

      <div className="mb-5 flex items-center gap-5 text-xs font-medium text-text-dim">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red" /> New alerts
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan" /> Resolved
        </span>
      </div>

      <div className="h-60 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--evidra-red)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--evidra-red)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--evidra-cyan)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--evidra-cyan)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--evidra-border-soft)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--evidra-text-faint)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--evidra-text-dim)", fontSize: 11 }}
            />
            <YAxis
              stroke="var(--evidra-text-faint)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 50]}
              ticks={[0, 10, 20, 30, 40, 50]}
              width={38}
              tick={{ fill: "var(--evidra-text-dim)", fontSize: 11 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--evidra-border)", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="alerts"
              name="New alerts"
              stroke="var(--evidra-red)"
              strokeWidth={2}
              fill="url(#alertsGrad)"
              dot={{ r: 3.5, fill: "var(--evidra-red)", stroke: "var(--evidra-surface)", strokeWidth: 1 }}
              activeDot={{ r: 6, fill: "var(--evidra-red)", stroke: "var(--evidra-surface)", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="var(--evidra-cyan)"
              strokeWidth={2}
              fill="url(#resolvedGrad)"
              dot={{ r: 3.5, fill: "var(--evidra-cyan)", stroke: "var(--evidra-surface)", strokeWidth: 1 }}
              activeDot={{ r: 6, fill: "var(--evidra-cyan)", stroke: "var(--evidra-surface)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
