"use client";

import { useMemo } from "react";
import { Card, SectionLabel, Badge } from "@/components/ui/primitives";
import { TimelineEvent } from "@/lib/types";
import { Activity } from "lucide-react";

interface DensityBucket {
  timeLabel: string;
  startTime: number;
  endTime: number;
  tooltip: string;
  count: number;
  hasHighSignal: boolean;
  eventId?: string;
}

type Granularity = "minute" | "hour" | "day" | "week" | "month";

const MAX_BUCKETS = 24;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function startOfLocalDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfLocalWeek(time: number): number {
  const date = new Date(startOfLocalDay(time));
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
}

function startOfLocalMonth(time: number): number {
  const date = new Date(time);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addCalendarUnits(time: number, granularity: Granularity, units: number): number {
  const date = new Date(time);
  if (granularity === "minute") date.setMinutes(date.getMinutes() + units);
  if (granularity === "hour") date.setHours(date.getHours() + units);
  if (granularity === "day") date.setDate(date.getDate() + units);
  if (granularity === "week") date.setDate(date.getDate() + units * 7);
  if (granularity === "month") date.setMonth(date.getMonth() + units);
  return date.getTime();
}

function alignToBucket(time: number, granularity: Granularity, step: number): number {
  const date = new Date(time);
  if (granularity === "minute") {
    date.setSeconds(0, 0);
    date.setMinutes(Math.floor(date.getMinutes() / step) * step);
    return date.getTime();
  }
  if (granularity === "hour") {
    date.setMinutes(0, 0, 0);
    date.setHours(Math.floor(date.getHours() / step) * step);
    return date.getTime();
  }
  if (granularity === "day") return startOfLocalDay(time);
  if (granularity === "week") return startOfLocalWeek(time);
  return startOfLocalMonth(time);
}

function formatAxisLabel(time: number, granularity: Granularity): string {
  const options: Intl.DateTimeFormatOptions = granularity === "minute" || granularity === "hour"
    ? { hour: "2-digit", minute: "2-digit" }
    : granularity === "month"
    ? { month: "short", year: "numeric" }
    : { month: "short", day: "numeric" };
  const label = new Date(time).toLocaleString([], options);
  return granularity === "week" ? `${label} wk` : label;
}

function formatFullDateTime(time: number): string {
  return new Date(time).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function TimelineSparkline({ timeline, onSelectEvent }: { timeline: TimelineEvent[]; onSelectEvent?: (eventId: string) => void }) {
  const buckets = useMemo<DensityBucket[]>(() => {
    if (timeline.length === 0) return [];
    const timestamps = timeline.map((event) => new Date(event.timestamp).getTime()).filter(Number.isFinite);
    if (timestamps.length === 0) return [];
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const span = maxTime - minTime;

    // Thresholds: <=2h uses 5-minute buckets, <=48h uses hours,
    // <=30d uses days, <=180d uses weeks, and longer spans use months.
    // Each interval widens as needed so the chart never exceeds 24 bars.
    let granularity: Granularity;
    let step: number;
    if (span <= 2 * HOUR) {
      granularity = "minute";
      step = 5;
    } else if (span <= 48 * HOUR) {
      granularity = "hour";
      step = Math.max(1, Math.ceil(span / (MAX_BUCKETS * HOUR)));
    } else if (span <= 30 * DAY) {
      granularity = "day";
      step = Math.max(1, Math.ceil(span / (MAX_BUCKETS * DAY)));
    } else if (span <= 180 * DAY) {
      granularity = "week";
      step = Math.max(1, Math.ceil(span / (MAX_BUCKETS * 7 * DAY)));
    } else {
      granularity = "month";
      step = Math.max(1, Math.ceil(span / (MAX_BUCKETS * 30 * DAY)));
    }

    const firstBucket = alignToBucket(minTime, granularity, granularity === "week" ? 1 : step);
    const result: DensityBucket[] = [];
    let bucketStart = firstBucket;
    while (bucketStart <= maxTime || result.length === 0) {
      const endTime = addCalendarUnits(bucketStart, granularity, step);
      result.push({
        timeLabel: formatAxisLabel(bucketStart, granularity),
        startTime: bucketStart,
        endTime,
        tooltip: `${formatFullDateTime(bucketStart)} - ${formatFullDateTime(endTime)} | 0 events`,
        count: 0,
        hasHighSignal: false,
        eventId: undefined,
      });
      bucketStart = endTime;
      if (result.length >= MAX_BUCKETS && bucketStart <= maxTime) break;
    }

    timeline.forEach((event) => {
      const time = new Date(event.timestamp).getTime();
      if (!Number.isFinite(time)) return;
      let index = result.findIndex((bucket) => time >= bucket.startTime && time < bucket.endTime);
      if (index < 0) index = result.length - 1;
      result[index].count += 1;
      result[index].eventId ??= event.id;
      if (event.severity === "high" || event.severity === "critical" || event.severity === "watch") {
        result[index].hasHighSignal = true;
      }
    });
    result.forEach((bucket) => {
      bucket.tooltip = `${formatFullDateTime(bucket.startTime)} - ${formatFullDateTime(bucket.endTime)} | ${bucket.count} event${bucket.count === 1 ? "" : "s"}`;
    });
    return result;
  }, [timeline]);
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const axisIndices = buckets.length > 0
    ? [0, Math.floor((buckets.length - 1) / 4), Math.floor((buckets.length - 1) / 2), Math.floor((buckets.length - 1) * 3 / 4), buckets.length - 1]
    : [];

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
              aria-label={b.tooltip}
              title={`${b.tooltip}${b.hasHighSignal ? " (High signal anomaly)" : ""}`}
              style={{ height: `${heightPct}%` }}
              className={`flex-1 rounded-sm transition-all ${bg} ${
                b.count > 0 ? "cursor-pointer hover:brightness-125 hover:scale-y-110" : "cursor-default"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-text-faint">
        {axisIndices.map((index, labelIndex) => (
          <span key={`${index}-${labelIndex}`} className={labelIndex === 2 ? "font-semibold text-red" : undefined}>
            {buckets[index]?.timeLabel ?? "—"}
          </span>
        ))}
      </div>
    </Card>
  );
}
