"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-cyan text-white hover:bg-[#2851c7] card-shadow",
    secondary:
      "bg-surface-2 text-text border border-border hover:border-cyan/40 hover:bg-surface-2",
    ghost: "bg-transparent text-text-dim hover:text-text hover:bg-surface-2",
    danger: "bg-red-bg text-red border border-red/20 hover:bg-red/10",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-2.5 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2.5 rounded-xl gap-2",
    lg: "text-base px-6 py-3.5 rounded-xl gap-2.5",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "cyan" | "amber" | "red" | "green" | "violet";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-text-dim border-border",
    cyan: "bg-cyan-dim text-cyan border-cyan/20",
    amber: "bg-amber-bg text-amber border-amber/20",
    red: "bg-red-bg text-red border-red/20",
    green: "bg-green-bg text-green border-green/20",
    violet: "bg-violet-bg text-violet border-violet/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  className,
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "grain-card card-shadow rounded-2xl border border-border-soft",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-bg-raised px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20",
        className
      )}
      {...props}
    />
  );
}

export function SourceTag({ source }: { source: string }) {
  const map: Record<string, { tone: "cyan" | "amber" | "green" | "violet" | "neutral"; label: string }> = {
    CDR: { tone: "cyan", label: "CDR" },
    IPDR: { tone: "violet", label: "IPDR" },
    Banking: { tone: "amber", label: "Banking" },
    Social: { tone: "green", label: "Social" },
    Identity: { tone: "neutral", label: "Identity" },
  };
  const m = map[source] ?? { tone: "neutral" as const, label: source };
  return (
    <Badge tone={m.tone} className="font-mono uppercase">
      {m.label}
    </Badge>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text-faint", className)}>
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border-soft", className)} />;
}
