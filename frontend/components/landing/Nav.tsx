"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/primitives";
import { EvidraMark } from "@/components/ui/EvidraMark";

const links = [
  { href: "#modes", label: "Entry Modes" },
  { href: "#architecture", label: "Architecture" },
  { href: "#compare", label: "Comparison" },
  { href: "#trust", label: "Security" },
];

export function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-border-soft/80 bg-bg/75 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <EvidraMark size={26} />
          <span className="font-mono text-[15px] font-semibold tracking-[0.14em]">EVIDRA</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-text-dim transition-colors hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              Enter Command Center
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
