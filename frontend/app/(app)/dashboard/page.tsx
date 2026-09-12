"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard, listCases, CaseApiResponse } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";
import { StartInvestigation } from "@/components/dashboard/StartInvestigation";
import { Search } from "lucide-react";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [cases, setCases] = useState<CaseApiResponse[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    Promise.all([getDashboard(), listCases()])
      .then(([summary, nextCases]) => {
        setDashboard(summary);
        setCases(nextCases);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const summary = (dashboard?.summary ?? {}) as Record<string, number>;
  const statusOptions = Array.from(
    new Set(cases.map((item) => item.status).filter((value): value is NonNullable<typeof value> => Boolean(value))),
  ).sort();
  const priorityOptions = Array.from(
    new Set(cases.map((item) => item.priority).filter((value): value is NonNullable<typeof value> => Boolean(value))),
  ).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCases = cases.filter((item) => {
    const searchableText = [
      item.title,
      item.name,
      item.id,
      item.lead,
      item.case_type,
      item.description,
      item.event_description,
      ...(item.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
      (statusFilter === "all" || item.status === statusFilter) &&
      (priorityFilter === "all" || item.priority === priorityFilter)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
      <div><h1 className="text-2xl font-semibold text-text">Command Center</h1><p className="mt-1 text-sm text-text-dim">Live investigations from the backend database.</p></div>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["caseCount", "openAlerts", "entitiesTracked", "evidenceCount"].map((key) => (
          <Card key={key} className="p-5"><div className="font-mono text-2xl font-bold text-text">{summary[key] ?? "—"}</div><div className="mt-1 text-xs capitalize text-text-dim">{key.replace(/([A-Z])/g, " $1")}</div></Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-border-soft pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <SectionLabel>CASES</SectionLabel>
            <span className="text-xs text-text-faint">
              Showing {filteredCases.length} of {cases.length} cases
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search cases</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cases"
                className="w-full rounded-lg border border-border-soft bg-surface-2 py-2 pl-9 pr-3 text-xs text-text outline-none focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15 sm:w-56"
              />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-cyan/60 sm:w-32"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by priority</span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-cyan/60 sm:w-36"
              >
                <option value="all">All priorities</option>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
          </div>
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-text-dim">No cases returned.</p>
        ) : filteredCases.length === 0 ? (
          <p className="text-sm text-text-dim">No cases match your filters.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto pb-1">
            <div className="grid gap-3 pr-1 sm:grid-cols-2">
              {filteredCases.map((item) => <Link key={item.id} href={`/case/${item.id}`} className="rounded-lg border border-border-soft p-4 hover:border-cyan/50"><div className="font-medium text-text">{item.title ?? item.name}</div><div className="mt-1 text-xs text-text-dim">Case #{item.id} · {item.status ?? "active"}</div></Link>)}
            </div>
          </div>
        )}
      </Card>
      <StartInvestigation />
    </div>
  );
}
