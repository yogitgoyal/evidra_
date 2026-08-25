"use client";

import { Reveal } from "@/components/ui/Reveal";
import { Fingerprint, FileSearch2, MapPinned, ArrowRight } from "lucide-react";

const modes = [
  {
    icon: Fingerprint,
    mode: "Entity-led",
    start: "Known phone, account, handle, or IP",
    happens: "Expand the entity across all sources, build graph + timeline",
    output: "Connections, anomalies, footprint",
  },
  {
    icon: FileSearch2,
    mode: "Evidence-led",
    start: "A known transaction or record, identity unknown",
    happens: "Expand outward from the evidence to discover linked entities",
    output: "Entity candidates, evidence chains",
  },
  {
    icon: MapPinned,
    mode: "Event-led",
    start: "A known incident + time/location window",
    happens: "Build an investigation window, analyze activity within it",
    output: "Event-linked entities, leads",
  },
];

export function EntryModes() {
  return (
    <section id="modes" className="border-b border-border-soft bg-bg-raised/40 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
              02 — Core innovation
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three doors in. One engine.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-dim">
              Not every case begins with a clean phone number. EVIDRA starts from whatever
              fragment you actually have.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {modes.map((m, i) => (
            <Reveal key={m.mode} delay={i * 0.1}>
              <div className="relative flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-dim text-cyan">
                  <m.icon size={18} />
                </div>
                <h3 className="mb-4 font-mono text-sm font-semibold tracking-wide text-cyan">{m.mode}</h3>
                <dl className="space-y-3.5 text-[13px]">
                  <div>
                    <dt className="mb-1 text-[10px] uppercase tracking-wider text-text-faint">Starting point</dt>
                    <dd className="leading-relaxed text-text-dim">{m.start}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[10px] uppercase tracking-wider text-text-faint">What happens</dt>
                    <dd className="leading-relaxed text-text-dim">{m.happens}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[10px] uppercase tracking-wider text-text-faint">Output</dt>
                    <dd className="leading-relaxed text-text">{m.output}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-border-soft px-6 py-4 text-center font-mono text-[11px] uppercase tracking-wider text-text-faint">
            Entity Resolution
            <ArrowRight size={12} />
            Graph &amp; Pattern Analysis
            <ArrowRight size={12} />
            Timeline Reconstruction
            <ArrowRight size={12} />
            Lead Prioritization
            <ArrowRight size={12} />
            <span className="text-cyan">Evidence-Grounded Story</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
