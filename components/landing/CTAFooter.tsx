"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/primitives";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-command relative overflow-hidden py-24">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Turn fragments into a
            <br />
            <span className="text-cyan">court-defensible narrative.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-dim">
            Three minutes from a single phone number to a fully cited investigation story.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                Enter Command Center <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border-soft py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-8">
        <div className="flex items-center gap-2.5">
          <EvidraMark size={20} />
          <span className="font-mono text-[13px] tracking-[0.12em] text-text-dim">EVIDRA</span>
        </div>
        <p className="text-center text-[12px] text-text-faint">
          Case-level investigation workbench · Synthetic data demo · Built for PS6
        </p>
        <p className="text-[12px] text-text-faint">v0.1.0 — frontend prototype</p>
      </div>
    </footer>
  );
}
