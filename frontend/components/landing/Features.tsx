"use client";

import { Reveal } from "@/components/ui/Reveal";
import { BookOpenCheck, FileSearch, ListFilter, Waypoints, ScanEye } from "lucide-react";

const features = [
  {
    icon: BookOpenCheck,
    title: "Investigation Story Mode",
    desc: "Cross-domain correlation summarized into a narrative where every sentence cites its evidence ID, timestamp, rule, and confidence.",
  },
  {
    icon: FileSearch,
    title: "Evidence Provenance Viewer",
    desc: "Click any claim to see the exact source record, hash, ingestion time, and transformation chain behind it.",
  },
  {
    icon: ListFilter,
    title: "Contextual Lead Prioritization",
    desc: "Ranks leads by temporal, relational, and cross-source relevance — not raw activity volume.",
  },
  {
    icon: Waypoints,
    title: "Hidden Bridge & Blast Radius",
    desc: "Betweenness-centrality and 1–2 hop expansion surface intermediaries connecting otherwise separate networks.",
  },
  {
    icon: ScanEye,
    title: "Explicit Uncertainty Handling",
    desc: "Never silently assumes a phone, account, or handle belong to the same person — ambiguous matches are flagged, not merged.",
  },
];

export function Features() {
  return (
    <section className="border-b border-border-soft bg-bg-raised/40 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
              04 — Capabilities
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Five things no reviewed platform does together.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07} className={i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}>
              <div className="h-full rounded-2xl border border-border-soft bg-surface p-6 transition-colors hover:border-cyan/30">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-dim text-cyan">
                  <f.icon size={16} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-text">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-text-dim">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
