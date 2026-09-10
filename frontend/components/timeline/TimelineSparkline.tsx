"use client";

import { useMemo } from "react";
import { Card, SectionLabel, Badge } from "@/components/ui/primitives";
import { TimelineEvent } from "@/lib/types";
import { Activity } from "lucide-react";

interface DensityBucket {
  timeLabel: string;
  count: number;
  hasHighSignal: boolean;
  eventId?: string;
}

export function TimelineSparkline({ timeline, onSelectEvent }: { timeline: TimelineEvent[]; onSelectEvent?: (eventId: string) => void }) {
  const buckets = useMemo<DensityBucket[]>(() => {
    if (timeline.length === 0) return [];
    const timestamps = timeline.map((event) => new Date(event.timestamp).getTime()).filter(Number.isFinite);
    if (timestamps.length === 0) return [];
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const bucketCount = Math.min(16, Math.max(1, timeline.length));
    const bucketSize = Math.max(60 * 60 * 1000, (maxTime - minTime) / bucketCount || 1);
    const result: DensityBucket[] = Array.from({ length: bucketCount }, (_, index) => ({
      timeLabel: new Date(minTime + index * bucketSize).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      count: 0,
      hasHighSignal: false,
      eventId: undefined,
    }));
    timeline.forEach((event) => {
      const time = new Date(event.timestamp).getTime();
      if (!Number.isFinite(time)) return;
      const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((time - minTime) / bucketSize)));
      result[index].count += 1;
      result[index].eventId ??= event.id;
      if (event.severity === "high" || event.severity === "critical" || event.severity === "watch") {
        result[index].hasHighSignal = true;
      }
    });
    return result;
  }, [timeline]);
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan" />
          <SectionLabel>EVENT DENSITY & ACTIVITY INTENSITY SPARKLINE</SectionLabel>
        </div>
        {buckets.some((bucket) => bucket.hasHighSignal) && (
          <Badge tone="amber" className="font-mono text-[10px]">
            HIGH-SIGNAL CLUSTERS PRESENT
          </Badge>
        )}
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
        <span>{buckets[0]?.timeLabel ?? "—"}</span>
        <span>{buckets[Math.floor(buckets.length / 4)]?.timeLabel ?? "—"}</span>
        <span className="font-semibold text-red">{buckets[Math.floor(buckets.length / 2)]?.timeLabel ?? "—"}</span>
        <span>{buckets[Math.floor((buckets.length * 3) / 4)]?.timeLabel ?? "—"}</span>
        <span>{buckets[buckets.length - 1]?.timeLabel ?? "—"}</span>
      </div>
    </Card>
  );
}
