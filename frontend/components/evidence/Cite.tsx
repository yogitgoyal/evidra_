"use client";

import { useEvidence } from "./EvidenceProvider";
import { cn } from "@/lib/utils";
import { FileSearch } from "lucide-react";

export function Cite({
  ids,
  children,
  chipKey,
}: {
  ids: string[];
  children?: React.ReactNode;
  chipKey?: string;
}) {
  const { show, activeChip } = useEvidence();
  const key = chipKey ?? ids.join(",");
  const active = activeChip === key;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        show(ids, key);
      }}
      className={cn(
        "relative mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-md border px-1.5 py-0.5 align-middle font-mono text-[10.5px] transition-all duration-150",
        active
          ? "border-cyan/40 bg-cyan-dim text-cyan"
          : "border-cyan/20 bg-cyan-dim/60 text-cyan hover:border-cyan/40 hover:bg-cyan-dim"
      )}
      title={`View evidence: ${ids.join(", ")}`}
    >
      <FileSearch size={10} className="opacity-80" />
      {children ?? (ids.length > 1 ? `${ids[0]} +${ids.length - 1}` : ids[0])}
    </button>
  );
}
