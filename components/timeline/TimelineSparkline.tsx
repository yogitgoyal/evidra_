"use client";

import { Card, SectionLabel, Badge } from "@/components/ui/primitives";
import { Activity } from "lucide-react";

interface DensityBucket {
  timeLabel: string;
  count: number;
  hasHighSignal: boolean;
  eventId?: string;
}

const buckets: DensityBucket[] = [
  { timeLabel: "09:00", count: 1, hasHighSignal: false, eventId: "tl1" },
  { timeLabel: "09:30", count: 0, hasHighSignal: false },
  { timeLabel: "10:00", count: 0, hasHighSignal: false },
  { timeLabel: "10:30", count: 1, hasHighSignal: false, eventId: "tl2" },
  { timeLabel: "11:00", count: 0, hasHighSignal: false },
  { timeLabel: "11:30", count: 1, hasHighSignal: false, eventId: "tl3" },
  { timeLabel: "12:00", count: 0, hasHighSignal: false },
  { timeLabel: "12:30", count: 1, hasHighSignal: false, eventId: "tl4" },
  { timeLabel: "13:00", count: 1, hasHighSignal: false, eventId: "tl5" },
  { timeLabel: "13:30", count: 4, hasHighSignal: true, eventId: "tl6" },
  { timeLabel: "14:00", count: 3, hasHighSignal: true, eventId: "tl7" },
  { timeLabel: "14:30", count: 1, hasHighSignal: false, eventId: "tl8" },
  { timeLabel: "15:00", count: 0, hasHighSignal: false },
  { timeLabel: "15:30", count: 2, hasHighSignal: true, eventId: "tl9" },
  { timeLabel: "16:00", count: 1, hasHighSignal: false, eventId: "tl10" },
  { timeLabel: "16:30", count: 0, hasHighSignal: false },
];

export function TimelineSparkline({ onSelectEvent }: { onSelectEvent?: (eventId: string) => void }) {
  const maxCount = 4;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan" />
          <SectionLabel>EVENT DENSITY & ACTIVITY INTENSITY SPARKLINE</SectionLabel>
        </div>
        <Badge tone="amber" className="font-mono text-[10px]">
          HIGH CLUSTER: 13:30 – 14:30
        </Badge>
      </div>

      <div className="flex h-14 w-full items-end gap-1.5 rounded-xl border border-border-soft bg-surface-2 p-2">
        {buckets.map((b, i) => {
          const heightPct = b.count > 0 ? (b.count / maxCount) * 100 : 8;
          const bg =
            b.count === 0
              ? "bg-border-soft/40"
              : b.hasHighSignal
              ? "bg-gradient-to-t from-amber to-red shadow-xs"
              : "bg-cyan/80";

          return (
            <button
              key={i}
              onClick={() => b.eventId && onSelectEvent?.(b.eventId)}
              disabled={b.count === 0}
              title={`${b.timeLabel} — ${b.count} event(s)${b.hasHighSignal ? " (High signal anomaly)" : ""}`}
              style={{ height: `${heightPct}%` }}
              className={`flex-1 rounded-sm transition-all ${bg} ${
                b.count > 0 ? "cursor-pointer hover:brightness-125 hover:scale-y-110" : "cursor-default"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-text-faint">
        <span>09:00</span>
        <span>11:00</span>
        <span className="font-semibold text-red">13:30 (Peak Cluster)</span>
        <span>15:00</span>
        <span>16:30</span>
      </div>
    </Card>
  );
}
