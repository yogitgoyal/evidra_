"use client";

import { Reveal } from "@/components/ui/Reveal";
import { Cite } from "@/components/evidence/Cite";
import { Database, Sigma, FileStack, Gauge, BrainCircuit, CheckCircle2, UserCheck, ArrowRight } from "lucide-react";

const steps = [
  { icon: Database, label: "Raw Data" },
  { icon: Sigma, label: "Deterministic Analytics" },
  { icon: FileStack, label: "Evidence Objects" },
  { icon: Gauge, label: "Risk Engine" },
  { icon: BrainCircuit, label: "LLM (narration only)" },
  { icon: CheckCircle2, label: "Claim Validator" },
  { icon: UserCheck, label: "Investigator" },
];

export function Pipeline() {
  return (
    <section id="architecture" className="border-b border-border-soft py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
              03 — AI architecture
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Grounded. Never guessing.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-dim">
              The model never discovers a relationship, never invents a number, and never assigns
              guilt. It only translates pre-computed, cited evidence into readable prose — every
              sentence validated against an evidence ID before it reaches you.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mb-10 flex flex-wrap items-center gap-2 overflow-x-auto rounded-2xl border border-border-soft bg-surface/50 p-5">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-2 px-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-soft bg-bg-raised text-cyan">
                    <s.icon size={16} />
                  </div>
                  <span className="max-w-[84px] text-[10px] leading-tight text-text-dim">{s.label}</span>
                </div>
                {i < steps.length - 1 && <ArrowRight size={14} className="shrink-0 text-text-faint" />}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-cyan/20 bg-cyan-dim p-6">
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-widest text-cyan">
              Example grounded output
            </span>
            <p className="text-[15px] leading-relaxed text-text-dim">
              &ldquo;Account A received transfers from 6 unrelated accounts within 18 minutes{" "}
              <Cite ids={["txn_0193", "txn_0194", "txn_0195"]} chipKey="pipeline-1" /> and shared a
              tower sector with Person B on 5 occasions{" "}
              <Cite ids={["cdr_0501", "cdr_0502"]} chipKey="pipeline-2" />.&rdquo;
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
