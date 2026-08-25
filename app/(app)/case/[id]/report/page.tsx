"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { cases, storyClaims, timeline, evidence, entities } from "@/lib/data";
import { Card, Button, Badge, SectionLabel } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { FileOutput, Check, Download, Loader2, FileText } from "lucide-react";

const sectionDefs = [
  { id: "summary", label: "Case summary", desc: "Header, priority, lead analyst, key stats" },
  { id: "story", label: "Investigation narrative", desc: "Evidence-grounded claims, cited sentence-by-sentence" },
  { id: "graph", label: "Relationship graph snapshot", desc: "Entity map with risk-weighted nodes" },
  { id: "timeline", label: "Digital timeline", desc: "Full reconstructed event sequence" },
  { id: "evidence", label: "Evidence appendix", desc: "Every source record, hash, and provenance chain" },
];

export default function ReportGeneratorPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const c = cases.find((x) => x.id === caseId) ?? cases[0];

  const [enabled, setEnabled] = useState<Set<string>>(new Set(sectionDefs.map((s) => s.id)));
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");

  function toggle(id: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else next.add(id);
      return next;
    });
  }

  function generate() {
    setStatus("generating");
    setTimeout(() => setStatus("ready"), 1600);
  }

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 px-6 py-8 lg:px-8">
      <div>
        <div className="flex items-center gap-2">
          <FileOutput size={16} className="text-cyan" />
          <h1 className="text-xl font-semibold tracking-tight text-text">Report Generator</h1>
        </div>
        <p className="mt-1 text-sm text-text-dim">
          Compile a court-defensible export — every claim keeps its citation, confidence, and detection rule.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-4">
          <SectionLabel className="mb-4">Sections to include</SectionLabel>
          <div className="space-y-2">
            {sectionDefs.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  enabled.has(s.id) ? "border-cyan/40 bg-cyan/5" : "border-border-soft bg-bg-raised"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    enabled.has(s.id) ? "border-cyan bg-cyan text-[#06231f]" : "border-border"
                  }`}
                >
                  {enabled.has(s.id) && <Check size={11} strokeWidth={3} />}
                </div>
                <div>
                  <div className="text-[12.5px] font-medium text-text">{s.label}</div>
                  <div className="text-[10.5px] text-text-faint">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-border-soft p-3 text-[10.5px] leading-relaxed text-text-faint">
            Demonstration uses synthetic data only. No real telecom, banking, or social-media systems are accessed.
          </div>

          <Button onClick={generate} disabled={status === "generating"} className="mt-5 w-full">
            {status === "generating" ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <FileText size={15} /> Generate report
              </>
            )}
          </Button>

          <AnimatePresence>
            {status === "ready" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                <Button variant="secondary" className="w-full">
                  <Download size={15} /> Download PDF (case-2047.pdf)
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <Card className="p-6 lg:col-span-8">
          <div className="mb-5 flex items-center justify-between">
            <SectionLabel>Live preview</SectionLabel>
            {status === "ready" && <Badge tone="green">Ready to export</Badge>}
          </div>

          <div className="max-h-[640px] space-y-6 overflow-y-auto rounded-xl border border-border-soft bg-bg-raised p-6 font-serif">
            <div className="border-b border-border-soft pb-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                Confidential — Investigation Report
              </div>
              <h2 className="mt-1 text-lg font-semibold text-text">{c.title}</h2>
              <div className="mt-2 flex gap-4 text-[11px] text-text-dim">
                <span>Opened {c.opened}</span>
                <span>Lead: {c.lead}</span>
                <span>Risk score: {c.riskScore}/100</span>
              </div>
            </div>

            {enabled.has("story") && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-text">Investigation Narrative</h3>
                <div className="space-y-2">
                  {storyClaims.map((claim) => (
                    <p key={claim.id} className="text-[12.5px] leading-relaxed text-text-dim">
                      {claim.text} <Cite ids={claim.evidenceIds} chipKey={`report-${claim.id}`} />
                    </p>
                  ))}
                </div>
              </section>
            )}

            {enabled.has("graph") && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-text">Relationship Graph Snapshot</h3>
                <p className="text-[12.5px] leading-relaxed text-text-dim">
                  {entities.length} entities and {entities.filter((e) => e.confidence === "ambiguous").length} ambiguous
                  matches resolved across telecom, banking, and social sources. Full interactive graph available in the
                  Investigation Graph view.
                </p>
              </section>
            )}

            {enabled.has("timeline") && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-text">Digital Timeline</h3>
                <div className="space-y-1.5">
                  {timeline.map((t) => (
                    <div key={t.id} className="flex gap-3 text-[12px] text-text-dim">
                      <span className="w-32 shrink-0 font-mono text-[10.5px] text-text-faint">{t.timestamp}</span>
                      <span>{t.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {enabled.has("evidence") && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-text">Evidence Appendix</h3>
                <p className="text-[12.5px] leading-relaxed text-text-dim">
                  {evidence.length} source records, each hash-verified and immutable. See appendix table for full chain
                  of custody.
                </p>
              </section>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
