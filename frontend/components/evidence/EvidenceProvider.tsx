"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileCheck2, Clock, Hash, Database, ShieldCheck, Download } from "lucide-react";
import { downloadEvidenceFile, getCaseAudit, getEvidenceRecord, AuditEntry } from "@/lib/api";
import { SourceTag } from "@/components/ui/primitives";

function sourceRecordHref(caseId: string, source: string): string | null {
  const paths: Record<string, string> = {
    CDR: "data",
    Banking: "banking",
    Social: "social",
    IPDR: "ipdr",
    Identity: "identity",
    Report: "reports",
  };
  const path = paths[source];
  return path ? `/case/${caseId}/${path}` : null;
}

interface EvidenceCtx {
  openIds: string[] | null;
  activeChip: string | null;
  show: (ids: string[], chipKey?: string) => void;
  close: () => void;
}

const Ctx = createContext<EvidenceCtx | null>(null);

export function useEvidence() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEvidence must be used within EvidenceProvider");
  return ctx;
}

export function EvidenceProvider({ children, caseId }: { children: ReactNode; caseId: string | null }) {
  const [openIds, setOpenIds] = useState<string[] | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, Awaited<ReturnType<typeof getEvidenceRecord>>> | null>(null);
  const [audits, setAudits] = useState<Record<string, AuditEntry[]>>({});
  const [error, setError] = useState("");

  const downloadOriginal = useCallback(async (record: Awaited<ReturnType<typeof getEvidenceRecord>>) => {
    if (!caseId || !record.hasOriginalFile) return;
    try {
      const blob = await downloadEvidenceFile(caseId, record.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = record.originalFilename || `${record.source.toLowerCase()}-${record.sourceRecordId || record.id}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download original file.");
    }
  }, [caseId]);

  const show = useCallback(async (ids: string[], chipKey?: string) => {
    if (!caseId) return;
    setError("");
    setOpenIds(ids);
    setActiveChip(chipKey ?? null);
    try {
      const entries = await Promise.all(ids.map(async (id) => {
        const record = await getEvidenceRecord(caseId, id);
        const auditEntries = await getCaseAudit(caseId, id);
        return [id, record, auditEntries] as const;
      }));
      setRecords(Object.fromEntries(entries));
      setAudits(Object.fromEntries(entries.map(([id, , auditEntries]) => [id, auditEntries])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence provenance.");
    }
  }, [caseId]);
  const close = useCallback(() => {
    setOpenIds(null);
    setActiveChip(null);
  }, []);

  return (
    <Ctx.Provider value={{ openIds, activeChip, show, close }}>
      {children}
      <AnimatePresence>
        {openIds && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.aside
              key="drawer"
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-[420px] overflow-y-auto border-l border-border bg-surface"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-surface/95 px-5 py-4 backdrop-blur">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan" />
                  <span className="text-sm font-semibold">Evidence Provenance</span>
                </div>
                <button
                  onClick={close}
                  className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4 p-5">
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                {!error && !records && <p className="text-sm text-text-dim">Loading evidence provenance…</p>}
                {openIds.map((id, idx) => {
                  const record = records?.[id];
                  if (!record) return null;
                  const recordAudits = audits[id] ?? [];
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.35 }}
                      className="rounded-xl border border-border-soft bg-bg-raised p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <SourceTag source={record.source} />
                        <span className="font-mono text-[11px] text-text-faint">{record.id}</span>
                      </div>
                      <p className="mb-3 text-sm leading-relaxed text-text">{record.summary}</p>

                      {caseId && sourceRecordHref(caseId, record.source) && (
                        <a
                          href={sourceRecordHref(caseId, record.source) ?? "#"}
                          className="mb-3 inline-flex items-center rounded-md border border-border-soft bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-dim hover:border-cyan/40 hover:text-cyan"
                          onClick={(event) => event.stopPropagation()}
                        >
                          View source record
                        </a>
                      )}

                      {record.hasOriginalFile && (
                        <button
                          type="button"
                          onClick={() => void downloadOriginal(record)}
                          className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-cyan/30 bg-cyan-dim px-2.5 py-1.5 text-xs font-medium text-cyan hover:border-cyan/50"
                        >
                          <Download size={12} />
                          Download original file
                        </button>
                      )}

                      {record.ruleTriggered && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan-dim px-3 py-2">
                          <FileCheck2 size={13} className="shrink-0 text-cyan" />
                          <span className="font-mono text-[11px] text-cyan">
                            {record.ruleTriggered}
                            {record.confidence ? ` · confidence ${record.confidence.toFixed(2)}` : ""}
                          </span>
                        </div>
                      )}

                      <dl className="grid grid-cols-1 gap-2 text-xs">
                        <Row icon={<Clock size={12} />} label="Timestamp" value={record.timestamp} mono />
                        <Row icon={<Hash size={12} />} label="Record hash" value={record.hash} mono />
                        <Row icon={<Database size={12} />} label="Ingested" value={record.ingested} mono />
                      </dl>

                      <div className="mt-3 border-t border-border-soft pt-3">
                        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-faint">
                          Raw fields
                        </span>
                        <div className="space-y-1.5">
                          {Object.entries(record.fields).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-text-faint">{k}</span>
                              <span className="font-mono text-text-dim">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 border-t border-border-soft pt-3">
                        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-faint">
                          Audit trail ({recordAudits.length})
                        </span>
                        {recordAudits.length === 0 ? (
                          <p className="text-xs text-text-faint">No audit events recorded.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {recordAudits.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-medium text-text-dim">{entry.action}</span>
                                <span className="text-text-faint">{entry.user} · {entry.timestamp}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                <div className="rounded-xl border border-dashed border-border-soft px-4 py-3 text-[11px] leading-relaxed text-text-faint">
                  Chain of custody preserved. This record is immutable and hash-verified at query time —
                  it cannot be edited from this view.
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

function Row({ icon, label, value, mono }: { icon: ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-text-faint">
        {icon}
        {label}
      </span>
      <span className={mono ? "font-mono text-text-dim" : "text-text-dim"}>{value}</span>
    </div>
  );
}
