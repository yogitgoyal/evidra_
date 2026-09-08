"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { Button } from "@/components/ui/primitives";
import { RadarIcon, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-command flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <EvidraMark size={28} />
          <span className="font-mono text-base font-semibold tracking-[0.14em]">EVIDRA</span>
        </Link>

        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan/20 bg-cyan-dim">
          <span className="pulse-ring absolute inset-0 rounded-full text-cyan" />
          <RadarIcon size={30} className="text-cyan" />
        </div>

        <div className="font-mono text-5xl font-bold tracking-tight text-text">404</div>
        <h1 className="mt-3 text-lg font-semibold text-text">No record found at this coordinate</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-dim">
          The page, case, or entity you&apos;re looking for doesn&apos;t exist in this workspace — or you don&apos;t
          have access to it.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button>
              <ArrowLeft size={15} /> Back to Command Center
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Return to landing</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
