"use client";

import { Reveal } from "@/components/ui/Reveal";
import { Landmark, MapPin, ShieldCheck, Lock, Hash, Eye, UserCog } from "lucide-react";

export function Ecosystem() {
  return (
    <section className="border-b border-border-soft bg-bg-raised/40 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
            06 — Indian ecosystem
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Complements Samanvaya &amp; Pratibimb. Doesn&apos;t duplicate them.
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal delay={0.08}>
            <div className="flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-6">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-bg text-violet">
                <Landmark size={16} />
              </div>
              <h3 className="mb-2 text-sm font-semibold">I4C / Samanvaya &amp; Suspect Registry</h3>
              <p className="text-[13px] leading-relaxed text-text-dim">
                A national MIS and data-repository platform for inter-state linkage of crimes and
                criminals — banks and financial institutions have submitted over 1.84 million
                suspect identifier records and 2.46 million Layer-1 mule accounts as of late 2025.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-6">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-bg text-amber">
                <MapPin size={16} />
              </div>
              <h3 className="mb-2 text-sm font-semibold">Pratibimb</h3>
              <p className="text-[13px] leading-relaxed text-text-dim">
                A GIS-mapping module within Samanvaya that plots the locations of criminals and
                crime infrastructure using PM Gatishakti mapping for jurisdictional visibility.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.22}>
          <p className="mt-8 max-w-3xl rounded-xl border border-dashed border-border-soft px-5 py-4 text-[13px] italic leading-relaxed text-text-dim">
            &ldquo;India already has systems for national suspect-linkage and geo-mapping. EVIDRA is a
            case-level analyst workbench that turns an already-authorized data extract into a
            reproducible, evidence-backed investigation narrative.&rdquo;
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const trust = [
  { icon: UserCog, label: "Case-level RBAC", desc: "Analyst / Supervisor / Admin, JWT auth" },
  { icon: Hash, label: "Hash-chained audit logs", desc: "Immutable record of every query & export" },
  { icon: Lock, label: "SHA-256 integrity hashing", desc: "Every ingested file is fingerprinted" },
  { icon: Eye, label: "PII masking by default", desc: "Sensitive fields shielded in the UI" },
  { icon: ShieldCheck, label: "Human-in-the-loop", desc: "Every AI lead needs analyst review" },
];

export function TrustStrip() {
  return (
    <section id="trust" className="border-b border-border-soft py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
            07 — Security &amp; privacy
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            No claim of guilt from a risk score.
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {trust.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border-soft bg-surface/50 p-5">
                <t.icon size={16} className="mb-3 text-cyan" />
                <h4 className="mb-1.5 text-[13px] font-semibold text-text">{t.label}</h4>
                <p className="text-[12px] leading-relaxed text-text-faint">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <div className="mt-6 rounded-xl border border-amber/25 bg-amber-bg px-5 py-4 text-[12.5px] leading-relaxed text-amber">
            Demonstration uses synthetic data only. No real telecom, banking, or social-media
            systems are accessed. UI language always says &ldquo;investigative lead,&rdquo; never
            &ldquo;proof.&rdquo;
          </div>
        </Reveal>
      </div>
    </section>
  );
}
