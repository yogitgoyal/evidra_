"use client";

import { Reveal } from "@/components/ui/Reveal";
import { Check, X, Minus } from "lucide-react";

const rows = [
  { label: "Cross-domain fusion (telecom + banking + social)", gotham: "partial", cellebrite: "no", quantexa: "no", evidra: "yes" },
  { label: "Sentence-level evidence citation", gotham: "no", cellebrite: "no", quantexa: "no", evidra: "yes" },
  { label: "Automated narrative generation", gotham: "no", cellebrite: "no", quantexa: "partial", evidra: "yes" },
  { label: "Graph + timeline analysis", gotham: "yes", cellebrite: "partial", quantexa: "partial", evidra: "yes" },
  { label: "Hackathon-scale, lightweight deploy", gotham: "no", cellebrite: "no", quantexa: "no", evidra: "yes" },
];

const cell = (v: string) => {
  if (v === "yes") return <Check size={14} className="text-green" />;
  if (v === "no") return <X size={14} className="text-text-faint" />;
  return <Minus size={14} className="text-amber" />;
};

export function Comparison() {
  return (
    <section id="compare" className="border-b border-border-soft py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
              05 — Competitive landscape
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              A narrow, defensible niche.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-dim">
              EVIDRA doesn&apos;t compete with Palantir on scale, Quantexa on financial depth, or
              Samanvaya on national coordination — it pairs three entry points with sentence-level
              evidence-grounded storytelling.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-x-auto rounded-2xl border border-border-soft">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border-soft bg-surface/60">
                  <th className="px-5 py-3.5 text-left font-medium text-text-dim">Capability</th>
                  <th className="px-5 py-3.5 text-left font-medium text-text-dim">Palantir Gotham</th>
                  <th className="px-5 py-3.5 text-left font-medium text-text-dim">Cellebrite / Maltego / i2</th>
                  <th className="px-5 py-3.5 text-left font-medium text-text-dim">Quantexa</th>
                  <th className="px-5 py-3.5 text-left font-mono font-semibold text-cyan">EVIDRA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label} className={i % 2 ? "bg-surface/20" : ""}>
                    <td className="px-5 py-3.5 text-text-dim">{r.label}</td>
                    <td className="px-5 py-3.5">{cell(r.gotham)}</td>
                    <td className="px-5 py-3.5">{cell(r.cellebrite)}</td>
                    <td className="px-5 py-3.5">{cell(r.quantexa)}</td>
                    <td className="bg-cyan-dim/40 px-5 py-3.5">{cell(r.evidra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
