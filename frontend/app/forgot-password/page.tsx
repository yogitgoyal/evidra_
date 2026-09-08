"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { Button, Input } from "@/components/ui/primitives";
import { HeroGraph } from "@/components/landing/HeroGraph";
import { MailCheck, ShieldCheck, ArrowLeft, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 900);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="bg-command flex flex-col justify-between px-6 py-8 lg:px-16 lg:py-12">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <EvidraMark size={26} />
          <span className="font-mono text-[15px] font-semibold tracking-[0.14em]">EVIDRA</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-sm"
        >
          <Link
            href="/login"
            className="mb-6 flex items-center gap-1.5 text-xs text-text-faint transition-colors hover:text-text"
          >
            <ArrowLeft size={13} /> Back to sign in
          </Link>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <span className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-text-faint">
                    <ShieldCheck size={13} className="text-cyan" /> Account recovery
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
                  <p className="mt-2 text-sm text-text-dim">
                    Enter your analyst badge ID or registered email. We&apos;ll send a secure, single-use reset link —
                    the request is logged for audit like any other access event.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-dim">Badge ID or email</label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst.bhandari@cybercell.gov.in"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending reset link
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} /> Send reset link
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-bg text-green"
                >
                  <MailCheck size={22} />
                </motion.div>
                <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
                <p className="mt-2 text-sm text-text-dim">
                  If <span className="font-mono text-text">{email || "that account"}</span> matches an active analyst
                  record, a reset link is on its way. It expires in 15 minutes.
                </p>
                <div className="mt-6 rounded-lg border border-dashed border-border-soft px-3.5 py-2.5 text-[11px] leading-relaxed text-text-faint">
                  Demonstration environment — no email is actually sent. This screen simulates the confirmation
                  state only.
                </div>
                <Link href="/login">
                  <Button variant="secondary" className="mt-6 w-full">
                    Return to sign in
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-[11px] text-text-faint lg:text-left">
          Demonstration environment · synthetic data only · every access attempt is logged
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border-soft bg-bg-raised lg:block">
        <div className="scan-sweep absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center opacity-90">
          <div className="h-[440px] w-[440px]">
            <HeroGraph />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-raised via-bg-raised/80 to-transparent p-12">
          <p className="max-w-sm text-sm leading-relaxed text-text-dim">
            &ldquo;Case-level RBAC, hash-chained audit logs, and human-in-the-loop review on every AI-generated
            lead.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
