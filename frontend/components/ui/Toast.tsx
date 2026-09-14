"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "error" | "success" | "info";

interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg border px-4 py-3 text-sm shadow-lg",
        toast.type === "error" && "border-red/30 bg-red-bg text-red",
        toast.type === "success" && "border-green/30 bg-green-bg text-green",
        toast.type === "info" && "border-cyan/30 bg-cyan-dim text-cyan",
      )}
    >
      {toast.message}
    </div>
  );
}
