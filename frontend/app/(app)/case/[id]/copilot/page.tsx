"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CopilotMessage } from "@/lib/types";
import { Cite } from "@/components/evidence/Cite";
import { Badge, Card, SectionLabel } from "@/components/ui/primitives";
import {
  BotMessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Route,
  Link2,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Info,
} from "lucide-react";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { getCopilotSeed, queryCopilot } from "@/lib/api";

// Icon map per suggested query chip
function getSuggestionIcon(query: string) {
  if (query.includes("path")) return Route;
  if (query.includes("IMEI")) return Link2;
  if (query.includes("report")) return FileText;
  return ShieldAlert;
}

export default function CopilotPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    getCopilotSeed(caseId).then(setMessages).catch((err: Error) => setError(err.message));
  }, [caseId]);

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}${idCounter.current}`;
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: CopilotMessage = { id: nextId("u"), role: "analyst", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const claims = await queryCopilot(caseId, text);
      setMessages((prev) => [...prev, {
        id: nextId("a"),
        role: "evidra",
        text: claims.length ? claims.map((claim) => claim.text).join(" ") : "No matching evidence was found for that query.",
        claims,
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to query the investigation assistant.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col space-y-6 px-6 py-8 lg:px-8">
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {/* Top Header & Refined Grounded Trust Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BotMessageSquare size={18} className="text-cyan" />
            <h1 className="text-xl font-bold tracking-tight text-text">AI Copilot</h1>
          </div>
          <p className="mt-1 text-sm text-text-dim">
            Grounded investigation assistant — queries operate strictly over case evidence.
          </p>
        </div>

        {/* Refined Trust Banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-cyan/25 bg-gradient-to-r from-cyan-dim/50 via-surface-2 to-surface p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-dim text-cyan">
            <Sparkles size={18} />
          </div>
          <div className="text-xs">
            <div className="font-bold text-text">Grounded, never guessing</div>
            <div className="text-[11px] text-text-dim">Every claim cites hash-verified case evidence.</div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Responsive Layout Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Conversation Stream (Col 8) */}
        <Card className="flex flex-col p-6 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between border-b border-border-soft pb-3">
            <SectionLabel>ACTIVE INVESTIGATION CONVERSATION</SectionLabel>
            <div className="group relative flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan-dim/40 px-3 py-1 text-[11px] font-semibold text-cyan">
              <ShieldCheck size={13} />
              <span>Allowlisted Queries Only</span>
              <Info size={11} className="text-cyan/70" />

              {/* Tooltip on Hover */}
              <div className="pointer-events-none absolute right-0 top-7 z-20 hidden w-64 rounded-xl border border-border bg-surface p-2.5 text-[10.5px] font-normal text-text-dim shadow-xl group-hover:block">
                Queries operate strictly over allowlisted intent models against case evidence to guarantee zero hallucination.
              </div>
            </div>
          </div>

          {/* Chat Messages Flow */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-1 select-text" style={{ maxHeight: "560px" }}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-start gap-3 ${m.role === "analyst" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                {m.role === "evidra" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan-dim text-cyan shadow-2xs">
                    <EvidraMark size={16} />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text font-mono text-xs font-bold text-surface shadow-2xs">
                    RB
                  </div>
                )}

                <div className={`flex flex-col max-w-xl ${m.role === "analyst" ? "items-end" : "items-start"}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-4 text-sm leading-relaxed ${
                      m.role === "analyst"
                        ? "rounded-2xl rounded-tr-xs bg-[#2f5fe0] text-white font-medium shadow-xs"
                        : "rounded-2xl rounded-tl-xs border border-border-soft bg-surface card-shadow text-text"
                    }`}
                  >
                    <p>{m.text}</p>

                    {/* Integrated Cited Evidence Claim Chips */}
                    {m.claims && m.claims.length > 0 && (
                      <div className="mt-3.5 space-y-2.5 border-t border-border-soft/80 pt-3">
                        {m.claims.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border-l-2 border-cyan bg-surface-2 p-3 text-xs text-text-dim"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-mono text-[10.5px] font-bold text-text">Claim #{c.id}</span>
                              <Badge
                                tone={Number(c.confidence) >= 0.85 ? "green" : "amber"}
                                className="font-mono text-[10px]"
                              >
                                confidence {c.confidence}
                              </Badge>
                            </div>
                            <p className="text-[12px] leading-relaxed text-text">
                              {c.text} <Cite ids={c.evidenceIds} chipKey={`copilot-${c.id}`} />
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Follow-up Suggestion Quick Reply Chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.suggestions.map((s) => {
                        const Icon = getSuggestionIcon(s);
                        return (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-text-dim shadow-2xs transition-all hover:-translate-y-0.5 hover:border-cyan/40 hover:bg-cyan-dim hover:text-cyan"
                          >
                            <Icon size={13} className="text-cyan" />
                            <span>{s}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Animated Thinking State Indicator */}
            {thinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan-dim text-cyan shadow-2xs">
                  <EvidraMark size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border-soft bg-surface p-3.5 text-xs font-semibold text-text-dim card-shadow">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span>Querying grounded evidence graph…</span>
                </div>
              </motion.div>
            )}

            <div ref={endRef} />
          </div>

          {/* Redesigned Pill Input Bar */}
          <div className="mt-5 border-t border-border-soft pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1.5 pl-4 pr-1.5 transition-all focus-within:border-cyan focus-within:ring-2 focus-within:ring-cyan/20"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about account ••4471, the shared IMEI, or entity connections…"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f5fe0] text-white shadow-xs transition-all hover:bg-[#2851c7] disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </Card>

        {/* Right Sidebar: Grounded Query Index & Provenance Guarantee (Col 4) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Quick Query Shortcuts */}
          <Card className="p-6">
            <SectionLabel className="mb-3">Quick Intent Shortcuts</SectionLabel>
            <p className="mb-4 text-xs text-text-dim">Click any allowlisted query below to execute instantly:</p>

            <div className="space-y-2">
              {[
                "Why is account ••4471 flagged?",
                "Show the shortest path between Subject A and K. Sethi",
                "Who else shares IMEI •••8841?",
                "Generate the case report",
              ].map((query) => {
                const Icon = getSuggestionIcon(query);
                return (
                  <button
                    key={query}
                    onClick={() => send(query)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-border-soft bg-surface-2 p-3 text-left text-xs font-medium text-text-dim transition-all hover:border-cyan/40 hover:bg-cyan-dim hover:text-cyan"
                  >
                    <Icon size={15} className="shrink-0 text-cyan" />
                    <span className="truncate">{query}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Provenance & Safety Guarantee Card */}
          <Card className="p-6">
            <SectionLabel className="mb-3">Provenance Guarantee</SectionLabel>
            <div className="space-y-3 text-xs text-text-dim">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan" />
                <span>All copilot responses are generated strictly from hash-verified case records.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan" />
                <span>Zero hallucination guarantee: uncited claims are automatically suppressed.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan" />
                <span>Every claim links directly to the immutable evidence chain of custody.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
