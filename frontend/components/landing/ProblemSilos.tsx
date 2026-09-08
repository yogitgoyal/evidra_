"use client";

import { Reveal } from "@/components/ui/Reveal";
import { PhoneCall, Landmark, Share2, Wifi } from "lucide-react";

const silos = [
  {
    icon: PhoneCall,
    label: "CDR",
    title: "Telecom",
    proves: "Who communicated, when, how often, approximate location",
    cannot: "Call content",
    color: "cyan" as const,
  },
  {
    icon: Wifi,
    label: "IPDR",
    title: "Data sessions",
    proves: "A device had a session with an endpoint at a given time",
    cannot: "What was read, written, or viewed",
    color: "violet" as const,
  },
  {
    icon: Landmark,
    label: "Banking",
    title: "Money movement",
    proves: "Velocity, fan-in/fan-out, circularity, dormancy-to-activity",
    cannot: "Intent behind a transaction",
    color: "amber" as const,
  },
  {
    icon: Share2,
    label: "OSINT",
    title: "Social",
    proves: "Public association, timing, public context",
    cannot: "Private messages, deleted content",
    color: "green" as const,
  },
];

const dot: Record<string, string> = {
  cyan: "bg-cyan",
  violet: "bg-violet",
  amber: "bg-amber",
  green: "bg-green",
};
const txt: Record<string, string> = {
  cyan: "text-cyan",
  violet: "text-violet",
  amber: "text-amber",
  green: "text-green",
};

export function ProblemSilos() {
  return (
    <section className="border-b border-border-soft py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
              01 — The problem
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Investigators work across three silos.
              <br />
              <span className="text-text-dim">No single workflow unifies them.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {silos.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="group h-full rounded-2xl border border-border-soft bg-surface/50 p-5 transition-colors hover:border-border">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 ${txt[s.color]}`}>
                    <s.icon size={16} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint">{s.label}</span>
                </div>
                <h3 className="mb-3 text-sm font-semibold text-text">{s.title}</h3>
                <div className="space-y-2.5 text-[12.5px] leading-relaxed">
                  <div className="flex gap-2">
                    <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot[s.color]}`} />
                    <span className="text-text-dim">
                      <span className="text-text-faint">Proves: </span>
                      {s.proves}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-faint" />
                    <span className="text-text-faint">
                      <span className="text-text-faint">Cannot prove: </span>
                      {s.cannot}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
