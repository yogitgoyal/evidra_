"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard, listCases, CaseApiResponse } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";
import { StartInvestigation } from "@/components/dashboard/StartInvestigation";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [cases, setCases] = useState<CaseApiResponse[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDashboard(), listCases()])
      .then(([summary, nextCases]) => {
        setDashboard(summary);
        setCases(nextCases);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const summary = (dashboard?.summary ?? {}) as Record<string, number>;
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
        <SectionLabel className="mb-4">CASES</SectionLabel>
        {cases.length === 0 ? <p className="text-sm text-text-dim">No cases returned.</p> : <div className="grid gap-3 sm:grid-cols-2">
          {cases.map((item) => <Link key={item.id} href={`/case/${item.id}`} className="rounded-lg border border-border-soft p-4 hover:border-cyan/50"><div className="font-medium text-text">{item.title ?? item.name}</div><div className="mt-1 text-xs text-text-dim">Case #{item.id} · {item.status ?? "active"}</div></Link>)}
        </div>}
      </Card>
      <StartInvestigation />
    </div>
  );
}
