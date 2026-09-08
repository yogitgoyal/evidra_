"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { EvidraMark } from "@/components/ui/EvidraMark";
import { Button, Input } from "@/components/ui/primitives";
import { HeroGraph } from "@/components/landing/HeroGraph";
import { Fingerprint, KeyRound, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { login, setAuthToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [step] = useState<"credentials" | "mfa">("credentials");
  const [username, setUsername] = useState("analyst.bhandari");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await login(username, password);
      setAuthToken(response.access_token);
      router.push("/dashboard");
    } catch {
      setError("Sign-in failed. Use the configured demonstration officer credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
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
          <div className="mb-8">
            <span className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-text-faint">
              <ShieldCheck size={13} className="text-cyan" /> Secure analyst access
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {step === "credentials" ? "Sign in to your workspace" : "Verify your identity"}
            </h1>
            <p className="mt-2 text-sm text-text-dim">
              {step === "credentials"
                ? "Access is case-scoped and logged for audit."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "credentials" ? (
              <motion.div
                key="credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-dim">Badge / Analyst ID</label>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-dim">Password</label>
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-text-dim">
                    <input type="checkbox" defaultChecked className="accent-cyan" />
                    Remember this device
                  </label>
                  <a href="/forgot-password" className="text-cyan hover:underline">
                    Forgot password?
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mfa"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      maxLength={1}
                      defaultValue={String((i * 7 + 2) % 10)}
                      className="h-12 w-full rounded-lg border border-border bg-bg-raised text-center font-mono text-lg outline-none focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15"
                    />
                  ))}
                </div>
                <p className="text-xs text-text-faint">
                  Didn&apos;t get a code?{" "}
                  <a href="#" className="text-cyan hover:underline">
                    Resend
                  </a>
                </p>
              </motion.div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying
                </>
              ) : step === "credentials" ? (
                <>
                  <KeyRound size={16} /> Continue
                </>
              ) : (
                <>
                  <Fingerprint size={16} /> Verify &amp; enter
                </>
              )}
            </Button>
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
          </form>

          <div className="mt-6 flex items-center gap-3 text-[11px] text-text-faint">
            <div className="h-px flex-1 bg-border-soft" />
            or
            <div className="h-px flex-1 bg-border-soft" />
          </div>

          <button
            onClick={() => {
              setSsoLoading(true);
              setTimeout(() => router.push("/dashboard"), 1000);
            }}
            disabled={ssoLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border-soft py-2.5 text-sm text-text-dim transition-colors hover:border-cyan/40 hover:text-text disabled:opacity-60"
          >
            {ssoLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Redirecting to SSO provider
              </>
            ) : (
              <>
                Continue with SSO <ArrowRight size={14} />
              </>
            )}
          </button>
        </motion.div>

        <p className="text-center text-[11px] text-text-faint lg:text-left">
          Demonstration environment · synthetic data only · every access attempt is logged
        </p>
      </div>

      {/* Right: visual */}
      <div className="relative hidden overflow-hidden border-l border-border-soft bg-bg-raised lg:block">
        <div className="scan-sweep absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center opacity-90">
          <div className="h-[440px] w-[440px]">
            <HeroGraph />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-raised via-bg-raised/80 to-transparent p-12">
          <p className="max-w-sm text-sm leading-relaxed text-text-dim">
            &ldquo;EVIDRA never asks you to trust the AI — every claim it makes is provably
            traceable to raw evidence.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
