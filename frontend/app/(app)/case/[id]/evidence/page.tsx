"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getEvidence } from "@/lib/api";
import { EvidenceRecord } from "@/lib/types";
import { useEvidence } from "@/components/evidence/EvidenceProvider";
import { Card, SourceTag, SectionLabel, Input } from "@/components/ui/primitives";
import { FileSearch, Hash, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const sources = ["CDR", "IPDR", "Banking", "Social", "Identity", "Report"] as const;

const sourceColors: Record<string, string> = {
  CDR: "#0ea5e9",
  IPDR: "#6366f1",
  Banking: "#f59e0b",
  Social: "#ef4444",
  Identity: "#8b5cf6",
  Report: "#ef4444",
};

export default function EvidenceViewerPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(sources));
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { show } = useEvidence();

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError("");
    getEvidence(caseId, { limit: 100, offset: 0, fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then((data) => {
        setEvidence(data.evidence);
        setHasMore(data.hasMore);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caseId, fromDate, toDate]);

  async function loadMore() {
    if (!caseId || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getEvidence(caseId, { limit: 100, offset: evidence.length, fromDate: fromDate || undefined, toDate: toDate || undefined });
      setEvidence((current) => [...current, ...data.evidence]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more evidence.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Source type counts
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    sources.forEach((s) => (counts[s] = 0));
    evidence.forEach((e) => {
      if (counts[e.source] !== undefined) counts[e.source]++;
    });
    return counts;
  }, [evidence]);

  const totalRecords = evidence.length;

  const filtered = useMemo(() => {
    return evidence.filter((e) => {
      if (!activeSources.has(e.source)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.summary.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.hash.toLowerCase().includes(q) ||
        (e.ruleTriggered ?? "").toLowerCase().includes(q) ||
        Object.values(e.fields ?? {}).some((value) => String(value).toLowerCase().includes(q))
      );
    });
  }, [activeSources, query, evidence]);

  function toggle(s: string) {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s);
      } else next.add(s);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-6 py-8 lg:px-8">
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch size={16} className="text-cyan" />
            <h1 className="text-xl font-semibold tracking-tight text-text">Evidence Viewer</h1>
          </div>
          <p className="mt-1 text-sm text-text-dim">{totalRecords} immutable, hash-verified source records loaded.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search evidence, hash, filename…" className="w-64 pl-9" />
          </div>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Evidence from date" className="w-36" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Evidence to date" className="w-36" />
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>EVIDENCE SOURCE-TYPE COMPOSITION</SectionLabel>
          <span className="font-mono text-xs text-text-faint">Click segment to toggle filter</span>
        </div>
        <div className="flex h-4.5 w-full overflow-hidden rounded-full bg-surface-2 p-0.5 shadow-inner">
          {sources.map((s) => {
            const count = sourceBreakdown[s] || 0;
            const pct = totalRecords ? (count / totalRecords) * 100 : 0;
            const active = activeSources.has(s);
            if (count === 0) return null;
            return <button key={s} onClick={() => toggle(s)} title={`${s}: ${count} records (${Math.round(pct)}%)`} style={{ width: `${pct}%`, backgroundColor: active ? sourceColors[s] : "var(--evidra-surface-3)" }} className={cn("h-full first:rounded-l-full last:rounded-r-full transition-all hover:brightness-110", !active && "opacity-30")} />;
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {sources.map((s) => {
            const count = sourceBreakdown[s] || 0;
            const pct = totalRecords ? Math.round((count / totalRecords) * 100) : 0;
            const active = activeSources.has(s);
            return <button key={s} onClick={() => toggle(s)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all", active ? "border-border bg-surface font-semibold text-text shadow-2xs" : "border-border-soft bg-transparent text-text-faint opacity-45 hover:opacity-80")}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sourceColors[s] }} /><span>{s}</span><span className="font-mono text-[11px] text-text-faint">({count} · {pct}%)</span></button>;
          })}
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center"><SectionLabel className="justify-center">Loading evidence records</SectionLabel></Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center"><SectionLabel className="justify-center">No matching records</SectionLabel><p className="mt-2 text-sm text-text-dim">Try a different search term or enable more sources.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((rec, i) => (
              <motion.button key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.35 }} onClick={() => show([rec.id], `viewer-${rec.id}`)} className="flex flex-col items-start gap-2.5 rounded-xl border border-border-soft bg-surface p-4 text-left transition-all hover:border-cyan/40 hover:bg-surface-2">
                <div className="flex w-full items-center justify-between"><SourceTag source={rec.source} /><span className="flex items-center gap-1 font-mono text-[10px] text-text-faint"><Hash size={9} /> {rec.id}</span></div>
                <p className="text-[13px] leading-snug text-text">{rec.summary}</p>
                <div className="flex w-full items-center justify-between font-mono text-[10.5px] text-text-faint"><span>{rec.timestamp}</span>{rec.ruleTriggered && <span className="text-cyan/80">{rec.ruleTriggered}</span>}</div>
              </motion.button>
            ))}
          </div>
          {hasMore && <div className="flex justify-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-xl border border-border-soft bg-surface px-4 py-2 text-xs font-medium text-text-dim hover:border-cyan/40 hover:text-cyan disabled:opacity-50">{loadingMore ? "Loading…" : "Load more evidence"}</button></div>}
        </>
      )}
    </div>
  );
}
