"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { Cite } from "@/components/evidence/Cite";
import { HeroGraph } from "./HeroGraph";

export function Hero() {
  return (
    <section className="bg-command bg-noise relative overflow-hidden border-b border-border-soft">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge tone="cyan" className="mb-6">
              <Sparkles size={11} /> Problem Statement 6 — Multi-Source Investigative Analytics
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-text sm:text-5xl lg:text-[3.2rem]"
          >
            Start with what you know.
            <br />
            <span className="text-cyan">Discover what you don&apos;t</span> — and prove it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-text-dim"
          >
            EVIDRA fuses telecom (CDR/IPDR), banking, and social/OSINT records into a single
            case workbench — a cross-source graph, a reconstructed timeline, and a plain-language
            investigation story where <span className="text-text">every sentence cites its source</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/dashboard">
              <Button size="lg">
                Enter Command Center <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/case/2047">
              <Button variant="secondary" size="lg">
                Open demo case #2047
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 max-w-lg rounded-xl border border-border-soft bg-surface/60 p-4 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-text-faint">
              <ShieldCheck size={12} className="text-cyan" /> Live evidence trace — try clicking a citation
            </div>
            <p className="text-[13px] leading-relaxed text-text-dim">
              Account ••4471 received transfers from 3 unrelated accounts within 18 minutes{" "}
              <Cite ids={["txn_0193", "txn_0194", "txn_0195"]} /> and shared a tower sector with K.
              Sethi on 5 occasions <Cite ids={["cdr_0501", "cdr_0502"]} />.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[440px]"
        >
          <div className="scan-sweep absolute inset-0 rounded-3xl border border-border-soft bg-surface/40" />
          <HeroGraph />
          <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            case_2047.graph
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 font-mono text-[10px] text-cyan">
            <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-cyan" />
            live correlation
          </div>
        </motion.div>
      </div>
    </section>
  );
}
