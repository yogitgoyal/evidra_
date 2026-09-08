"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Card } from "@/components/ui/primitives";
import { Briefcase, AlertTriangle, Users, Clock, MoreVertical } from "lucide-react";

function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => v.toFixed(decimals));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

const defaultStats = {
  activeCases: 3,
  openAlerts: 14,
  highSeverityAlerts: 6,
  entitiesTracked: 54,
  caseCount: 4,
  avgTimeToLeadMinutes: 6.4,
};

const stats = (summary: typeof defaultStats) => [
  {
    icon: Briefcase,
    label: "Active Cases",
    value: summary.activeCases,
    sub: "1 critical priority",
    change: "↑20%",
    tone: "cyan" as const,
    sparkline: [1.2, 1.8, 1.6, 2.4, 3.0],
  },
  {
    icon: AlertTriangle,
    label: "Open Alerts",
    value: summary.openAlerts,
    sub: `${summary.highSeverityAlerts} high severity`,
    change: "↑12%",
    tone: "red" as const,
    sparkline: [8, 11, 9.5, 12.8, 14.0],
  },
  {
    icon: Users,
    label: "Entities Tracked",
    value: summary.entitiesTracked,
    sub: `across ${summary.caseCount} cases`,
    change: "↑18%",
    tone: "violet" as const,
    sparkline: [36, 41, 44, 49, 54.0],
  },
  {
    icon: Clock,
    label: "Avg. Time to Lead",
    value: summary.avgTimeToLeadMinutes,
    decimals: 1,
    sub: "minutes, down 22%",
    change: "↓22%",
    tone: "green" as const,
    sparkline: [12.0, 10.2, 8.8, 7.3, 6.4],
  },
];

const iconTone: Record<string, string> = {
  cyan: "bg-cyan-dim text-cyan",
  red: "bg-red-bg text-red",
  violet: "bg-violet-bg text-violet",
  green: "bg-green-bg text-green",
};

const strokeColor: Record<string, string> = {
  cyan: "var(--evidra-cyan)",
  red: "var(--evidra-red)",
  violet: "var(--evidra-violet)",
  green: "var(--evidra-green)",
};

const textTone: Record<string, string> = {
  cyan: "text-cyan",
  red: "text-red",
  violet: "text-violet",
  green: "text-green",
};

function MiniSparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 68;
  const H = 28;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * W;
    const y = H - ((val - min) / range) * (H - 6) - 3;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="h-7 w-[68px] shrink-0 overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full overflow-visible"
        style={{ width: W, height: H }}
      >
        <defs>
          <linearGradient id={`spark-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#spark-grad-${id})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function StatCards({ summary = defaultStats }: { summary?: typeof defaultStats }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats(summary).map((s, i) => (
        <Card
          key={s.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          className="p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTone[s.tone]}`}>
              <s.icon size={18} />
            </div>
            <button className="rounded-lg p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text-dim">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="font-mono text-3xl font-bold tracking-tight text-text">
            <Counter value={s.value} decimals={s.decimals} />
          </div>

          <div className="mt-1 text-xs font-semibold text-text">{s.label}</div>

          <div className="mt-4 flex items-end justify-between border-t border-border-soft pt-3">
            <div>
              <span className={`text-xs font-bold ${textTone[s.tone]}`}>
                {s.change}
              </span>
              <div className="mt-0.5 text-[11px] text-text-faint">{s.sub}</div>
            </div>
            <MiniSparkline data={s.sparkline} color={strokeColor[s.tone]} id={s.tone} />
          </div>
        </Card>
      ))}
    </div>
  );
}
