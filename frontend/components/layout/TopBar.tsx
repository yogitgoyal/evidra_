"use client";

import { usePathname, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseApiResponse, getCase } from "@/lib/api";
import { Search, Bell, Settings, ChevronRight, Calendar, ChevronDown } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Overview",
  graph: "Investigation Graph",
  timeline: "Digital Timeline",
  financial: "Financial Flow",
  map: "Geospatial View",
  copilot: "AI Copilot",
  evidence: "Evidence Viewer",
  report: "Report Generator",
};

export function TopBar() {
  const pathname = usePathname();
  const params = useParams();
  const caseId = params?.id as string | undefined;
  const [currentCase, setCurrentCase] = useState<CaseApiResponse | null>(null);

  useEffect(() => {
    if (!caseId) {
      setCurrentCase(null);
      return;
    }
    getCase(caseId).then(setCurrentCase).catch(() => setCurrentCase(null));
  }, [caseId]);

  let crumb: React.ReactNode = "Command Center";
  if (pathname === "/dashboard") crumb = "Command Center";
  else if (caseId) {
    const seg = pathname.split(`/case/${caseId}`)[1]?.replace("/", "") ?? "";
    crumb = (
      <span className="flex items-center gap-1.5">
        <span className="text-text-dim">{currentCase?.title ?? currentCase?.name ?? `Case #${caseId}`}</span>
        <ChevronRight size={13} className="text-text-faint" />
        <span className="font-semibold text-text">{routeLabels[seg] ?? "Overview"}</span>
      </span>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-sm font-semibold text-text">{crumb}</div>

      <div className="flex items-center gap-3">
        {/* Fully rounded pill search input with ⌘K shortcut hint */}
        <div className="relative hidden sm:block">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            placeholder="Search entities, evidence, cases…"
            className="w-80 rounded-full border border-border bg-surface-2 py-2 pl-9 pr-12 text-xs text-text placeholder:text-text-faint outline-none transition-colors focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-soft bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-faint">
            ⌘K
          </kbd>
        </div>

        {/* Date picker pill */}
        <button className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-dim transition-colors hover:bg-surface-2 md:flex">
          <Calendar size={13} className="text-text-faint" />
          <span>May 20, 2025 · Tuesday</span>
          <ChevronDown size={12} className="text-text-faint" />
        </button>

        {/* Notification Bell with red dot */}
        <button className="relative rounded-full p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red ring-2 ring-surface" />
        </button>

        {/* Settings button */}
        <button className="rounded-full p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text">
          <Settings size={16} />
        </button>

        {/* User avatar with green online status dot */}
        <div className="ml-1 flex items-center gap-2.5 border-l border-border-soft pl-3">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-dim font-mono text-xs font-semibold text-cyan">
              RB
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-green" />
          </div>
          <div className="hidden leading-tight md:block">
            <div className="text-xs font-semibold text-text">R. Bhandari</div>
            <div className="text-[10px] text-text-faint">Analyst · Cyber Cell</div>
          </div>
        </div>
      </div>
    </header>
  );
}
