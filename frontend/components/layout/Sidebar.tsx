"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { cn, riskColor } from "@/lib/utils";
import { listCases, CaseApiResponse } from "@/lib/api";
import {
  LayoutGrid,
  Workflow,
  GitFork,
  History,
  Landmark,
  MapPinned,
  BotMessageSquare,
  FileSearch,
  FileOutput,
  Wallet,
  Users2,
  ChevronLeft,
  FolderOpen,
  LogOut,
} from "lucide-react";

const caseTabs = [
  { href: "", label: "Overview", icon: Workflow },
  { href: "/graph", label: "Investigation Graph", icon: GitFork },
  { href: "/timeline", label: "Digital Timeline", icon: History },
  { href: "/financial", label: "Financial Flow", icon: Landmark },
  { href: "/map", label: "Geospatial View", icon: MapPinned },
  { href: "/copilot", label: "AI Copilot", icon: BotMessageSquare },
  { href: "/evidence", label: "Evidence Viewer", icon: FileSearch },
  { href: "/report", label: "Report Generator", icon: FileOutput },
  { href: "/data", label: "CDR Records", icon: FileSearch },
  { href: "/banking", label: "Banking Records", icon: Wallet },
  { href: "/social", label: "Social Records", icon: Users2 },
  { href: "/ipdr", label: "IPDR Records", icon: FileSearch },
  { href: "/identity", label: "Identity Records", icon: FileSearch },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const caseId = (params?.id as string) ?? null;
  const inCase = pathname.startsWith("/case/") && caseId;

  const [realCases, setRealCases] = useState<CaseApiResponse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listCases()
      .then(setRealCases)
      .catch((err: Error) => setError(err.message));
  }, []);

  const displayCases = (realCases ?? []).slice(0, 8).map((rc) => ({
    id: rc.id,
    label: rc.title ?? rc.name,
    riskScore: rc.riskScore ?? 0,
  }));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Top Header Logo */}
      <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <EvidraMark size={28} />
          <span className="font-mono text-sm font-bold tracking-[0.14em] text-text">EVIDRA</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        <NavItem href="/dashboard" icon={LayoutGrid} label="Command Center" active={pathname === "/dashboard"} />

        <div>
          <div className="mb-2.5 flex items-center gap-1.5 px-3 font-mono text-[10.5px] uppercase tracking-widest text-text-faint">
            <FolderOpen size={12} /> Recent Cases
          </div>
          <div className="space-y-1">
            {error && <p role="alert" className="px-3 text-[11px] text-red-500">{error}</p>}
            {displayCases.map((c) => (
              <Link
                key={c.id}
                href={`/case/${c.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  caseId === c.id
                    ? "bg-cyan-dim text-cyan font-semibold"
                    : "text-text-dim hover:bg-surface-2 hover:text-text"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: riskColor(c.riskScore) }}
                />
                <span className="truncate">{c.label}</span>
              </Link>
            ))}
            {!error && realCases && displayCases.length === 0 && (
              <p className="px-3 text-[11px] text-text-faint">No cases yet.</p>
            )}
          </div>
        </div>

        {inCase && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-2.5 flex items-center justify-between px-3">
              <span className="font-mono text-[10.5px] uppercase tracking-widest text-text-faint">
                Case #{caseId}
              </span>
              <Link href="/dashboard" className="text-text-faint hover:text-text">
                <ChevronLeft size={13} />
              </Link>
            </div>
            <div className="space-y-1">
              {caseTabs.map((t) => {
                const href = `/case/${caseId}${t.href}`;
                const active = pathname === href;
                return (
                  <Link
                    key={t.label}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-cyan-dim text-cyan font-semibold"
                        : "text-text-dim hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <t.icon size={15} />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      <div className="border-t border-border-soft p-3.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
        >
          <LogOut size={15} />
          Exit to landing
        </Link>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof LayoutGrid;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-cyan-dim text-cyan font-semibold"
          : "text-text-dim hover:bg-surface-2 hover:text-text"
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}