"use client";

import { motion } from "framer-motion";
import { EvidraMark } from "@/components/ui/EvidraMark";

export default function AppLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <EvidraMark size={32} />
        </motion.div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-text-faint">
          Loading workspace…
        </span>
      </motion.div>
    </div>
  );
}
