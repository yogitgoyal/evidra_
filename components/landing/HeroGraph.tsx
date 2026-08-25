"use client";

/**
 * HeroGraph Forensic / OSINT Correlation Graph Visualizer
 * --------------------------------------------------------
 * 1. Topology: 18 nodes (1 central radar hub + 6 Ring A nodes + 9 Ring B nodes + 2 outlier nodes).
 * 2. Curved Edges: Every edge is a quadratic bezier curve (M x1 y1 Q cx cy x2 y2).
 * 3. Radar Hub: Core cyan target node surrounded by dual counter-rotating dashed instrument rings & breathing pulse.
 * 4. Signal Comet Pulses: Glowing signal pulses with multi-dot fading trails traveling along sampled bezier keyframe paths.
 * 5. Sonar Pings: Staggered expanding ring bursts on select satellite nodes.
 * 6. Evidence Tag Cycling: Low-frequency (2.8s) AnimatePresence cross-fade of grounded evidence tags ("CDR MATCH", etc.).
 * 7. Reduced Motion: Detects OS prefers-reduced-motion setting and freezes visual loops into a clean static graph.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NodeItem {
  id: string;
  x: number;
  y: number;
  r: number;
  colorVar: string;
  isHollow?: boolean;
}

interface EdgeItem {
  id: string;
  source: string;
  target: string;
  p0: { x: number; y: number };
  cp: { x: number; y: number };
  p1: { x: number; y: number };
  isDashed?: boolean;
  opacity?: number;
  accentColor?: string;
  hasSignal?: boolean;
  signalDelay?: number;
  signalDuration?: number;
}

interface EvidenceTag {
  text: string;
  x: number;
  y: number;
}

// -----------------------------------------------------------------------------
// Precomputed Layout Geometry (460x460 canvas, center at 230, 230)
// -----------------------------------------------------------------------------

const CANVAS_CENTER = 230;

// 1. Hub Node
const hubNode: NodeItem = {
  id: "hub",
  x: CANVAS_CENTER,
  y: CANVAS_CENTER,
  r: 14,
  colorVar: "var(--evidra-cyan)",
};

// 2. Ring A (6 nodes at radius 95, evenly spaced 60° apart)
const ringANodes: NodeItem[] = [
  { id: "A0", x: 230.0, y: 135.0, r: 8, colorVar: "var(--evidra-cyan)" },
  { id: "A1", x: 312.3, y: 182.5, r: 8, colorVar: "var(--evidra-violet)" },
  { id: "A2", x: 312.3, y: 277.5, r: 8, colorVar: "var(--evidra-amber)" },
  { id: "A3", x: 230.0, y: 325.0, r: 8, colorVar: "var(--evidra-red)" },
  { id: "A4", x: 147.7, y: 277.5, r: 8, colorVar: "var(--evidra-green)" },
  { id: "A5", x: 147.7, y: 182.5, r: 8, colorVar: "var(--evidra-violet)" },
];

// 3. Ring B (9 nodes at radius 175, 3 hollow candidates)
const ringBNodes: NodeItem[] = [
  { id: "B0", x: 275.3, y: 61.0, r: 6, colorVar: "var(--evidra-cyan)" },
  { id: "B1", x: 373.4, y: 129.6, r: 6, colorVar: "var(--evidra-violet)" },
  { id: "B2", x: 399.0, y: 275.3, r: 6, colorVar: "var(--evidra-text-faint)", isHollow: true },
  { id: "B3", x: 304.0, y: 388.6, r: 6, colorVar: "var(--evidra-amber)" },
  { id: "B4", x: 156.0, y: 388.6, r: 6, colorVar: "var(--evidra-text-faint)", isHollow: true },
  { id: "B5", x: 65.6, y: 289.9, r: 6, colorVar: "var(--evidra-red)" },
  { id: "B6", x: 71.4, y: 156.0, r: 6, colorVar: "var(--evidra-text-faint)", isHollow: true },
  { id: "B7", x: 170.1, y: 65.6, r: 6, colorVar: "var(--evidra-green)" },
  { id: "B8", x: 304.0, y: 71.4, r: 6, colorVar: "var(--evidra-violet)" },
];

// 4. Outlier Nodes (2 distant hollow lead nodes)
const outlierNodes: NodeItem[] = [
  { id: "O0", x: 78.0, y: 78.0, r: 5, colorVar: "var(--evidra-text-faint)", isHollow: true },
  { id: "O1", x: 394.7, y: 368.2, r: 5, colorVar: "var(--evidra-text-faint)", isHollow: true },
];

const allNodes: NodeItem[] = [hubNode, ...ringANodes, ...ringBNodes, ...outlierNodes];
const nodeMap = new Map<string, NodeItem>(allNodes.map((n) => [n.id, n]));

// -----------------------------------------------------------------------------
// Quadratic Bezier Helper & Edge Precomputation
// -----------------------------------------------------------------------------

function computeBezierControlPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  offset: number
) {
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return {
    x: Math.round((mx + nx * offset) * 10) / 10,
    y: Math.round((my + ny * offset) * 10) / 10,
  };
}

function sampleBezierKeyframes(
  p0: { x: number; y: number },
  cp: { x: number; y: number },
  p1: { x: number; y: number },
  samples = 28
) {
  const cxKeyframes: number[] = [];
  const cyKeyframes: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const inv = 1 - t;
    const x = inv * inv * p0.x + 2 * inv * t * cp.x + t * t * p1.x;
    const y = inv * inv * p0.y + 2 * inv * t * cp.y + t * t * p1.y;
    cxKeyframes.push(Math.round(x * 10) / 10);
    cyKeyframes.push(Math.round(y * 10) / 10);
  }
  return { cxKeyframes, cyKeyframes };
}

interface EdgeDefinition {
  id: string;
  src: string;
  tgt: string;
  offset: number;
  isDashed?: boolean;
  opacity?: number;
  accentColor?: string;
  hasSignal?: boolean;
  signalDelay?: number;
  signalDuration?: number;
}

const rawEdgeDefinitions: EdgeDefinition[] = [
  // Hub -> Ring A
  { id: "e-h-A0", src: "hub", tgt: "A0", offset: 16, hasSignal: true, accentColor: "var(--evidra-cyan)", signalDelay: 0.2, signalDuration: 2.0 },
  { id: "e-h-A1", src: "hub", tgt: "A1", offset: -16, hasSignal: true, accentColor: "var(--evidra-violet)", signalDelay: 1.8, signalDuration: 2.2 },
  { id: "e-h-A2", src: "hub", tgt: "A2", offset: 16 },
  { id: "e-h-A3", src: "hub", tgt: "A3", offset: -16, hasSignal: true, accentColor: "var(--evidra-red)", signalDelay: 3.2, signalDuration: 2.1 },
  { id: "e-h-A4", src: "hub", tgt: "A4", offset: 16, hasSignal: true, accentColor: "var(--evidra-green)", signalDelay: 1.1, signalDuration: 1.9 },
  { id: "e-h-A5", src: "hub", tgt: "A5", offset: -16 },

  // Ring A -> Ring B
  { id: "e-A0-B0", src: "A0", tgt: "B0", offset: -14 },
  { id: "e-A0-B8", src: "A0", tgt: "B8", offset: 14 },
  { id: "e-A1-B1", src: "A1", tgt: "B1", offset: -16 },
  { id: "e-A1-B2", src: "A1", tgt: "B2", offset: 16, isDashed: true },
  { id: "e-A2-B3", src: "A2", tgt: "B3", offset: -14, hasSignal: true, accentColor: "var(--evidra-amber)", signalDelay: 2.6, signalDuration: 2.3 },
  { id: "e-A3-B4", src: "A3", tgt: "B4", offset: 16, isDashed: true },
  { id: "e-A4-B5", src: "A4", tgt: "B5", offset: -14, hasSignal: true, accentColor: "var(--evidra-red)", signalDelay: 4.0, signalDuration: 2.0 },
  { id: "e-A5-B6", src: "A5", tgt: "B6", offset: 16, isDashed: true },
  { id: "e-A5-B7", src: "A5", tgt: "B7", offset: -14 },

  // Ring A -> Ring A Mesh Cross-links
  { id: "e-A0-A2", src: "A0", tgt: "A2", offset: 20, hasSignal: true, accentColor: "var(--evidra-cyan)", signalDelay: 0.7, signalDuration: 2.4 },
  { id: "e-A2-A4", src: "A2", tgt: "A4", offset: 20 },
  { id: "e-A4-A0", src: "A4", tgt: "A0", offset: 20 },

  // Outlier Leads
  { id: "e-h-O0", src: "hub", tgt: "O0", offset: -22, isDashed: true, opacity: 0.35 },
  { id: "e-h-O1", src: "hub", tgt: "O1", offset: 22, isDashed: true, opacity: 0.35 },
];

// Precompute Edge Objects + Bezier Control Points
const precomputedEdges: EdgeItem[] = rawEdgeDefinitions.map((def) => {
  const p0 = nodeMap.get(def.src)!;
  const p1 = nodeMap.get(def.tgt)!;
  const cp = computeBezierControlPoint(p0, p1, def.offset);
  return {
    id: def.id,
    source: def.src,
    target: def.tgt,
    p0: { x: p0.x, y: p0.y },
    cp,
    p1: { x: p1.x, y: p1.y },
    isDashed: def.isDashed,
    opacity: def.opacity ?? 0.65,
    accentColor: def.accentColor || p0.colorVar,
    hasSignal: def.hasSignal,
    signalDelay: def.signalDelay,
    signalDuration: def.signalDuration,
  };
});

// Grounded Evidence Tags
const evidenceTags: EvidenceTag[] = [
  { text: "CDR TOWER MATCH", x: 310, y: 155 },
  { text: "TOWER OVERLAP", x: 260, y: 35 },
  { text: "IP CORRELATION", x: 45, y: 140 },
  { text: "BANK MULE LINK", x: 295, y: 405 },
  { text: "SOCIAL TRACE", x: 40, y: 265 },
  { text: "DEVICE FINGERPRINT MATCH", x: 275, y: 95 },
];

// Instrument Bezel Radial Ticks
const bezelTicks = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  return {
    x1: Math.round((230 + 210 * Math.cos(angle)) * 10) / 10,
    y1: Math.round((230 + 210 * Math.sin(angle)) * 10) / 10,
    x2: Math.round((230 + 218 * Math.cos(angle)) * 10) / 10,
    y2: Math.round((230 + 218 * Math.sin(angle)) * 10) / 10,
  };
});

// -----------------------------------------------------------------------------
// Component Implementation
// -----------------------------------------------------------------------------

export function HeroGraph() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  const [tagIndex, setTagIndex] = useState(0);

  // Detect OS Reduced Motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Low-frequency (2.8s) evidence tag cycling
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setTagIndex((prev) => (prev + 1) % evidenceTags.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  // Precalculate sampled keyframe paths for signal pulses
  const activeSignalPaths = useMemo(() => {
    return precomputedEdges
      .filter((e) => e.hasSignal)
      .map((e) => ({
        edge: e,
        keyframes: sampleBezierKeyframes(e.p0, e.cp, e.p1, 28),
      }));
  }, []);

  const currentTag = evidenceTags[tagIndex];

  return (
    <div className="relative h-full w-full select-none">
      <svg viewBox="0 0 460 460" className="h-full w-full overflow-visible">
        {/* ----------------------------------------------------------------- */}
        {/* 1. Outer Instrument Dial / Bezel                                 */}
        {/* ----------------------------------------------------------------- */}
        <motion.g
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "230px 230px" }}
        >
          <circle
            cx={230}
            cy={230}
            r={215}
            fill="none"
            stroke="var(--evidra-border)"
            strokeWidth={1}
            strokeDasharray="4 8"
            opacity={0.35}
          />
          {bezelTicks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="var(--evidra-border)"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}
        </motion.g>

        {/* ----------------------------------------------------------------- */}
        {/* 2. Quadratic Bezier Edges                                         */}
        {/* ----------------------------------------------------------------- */}
        <g>
          {precomputedEdges.map((e, i) => {
            const d = `M ${e.p0.x} ${e.p0.y} Q ${e.cp.x} ${e.cp.y} ${e.p1.x} ${e.p1.y}`;
            return (
              <motion.path
                key={e.id}
                d={d}
                fill="none"
                stroke="var(--evidra-border)"
                strokeWidth={e.isDashed ? 1.2 : 1.5}
                strokeDasharray={e.isDashed ? "3 4" : undefined}
                opacity={e.opacity}
                initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.4,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* 3. Traveling Signal Comet Pulses (Multi-dot Fading Trail)          */}
        {/* ----------------------------------------------------------------- */}
        {!reducedMotion &&
          activeSignalPaths.map(({ edge, keyframes }) => {
            const duration = edge.signalDuration || 2.2;
            const delay = edge.signalDelay || 0;
            const accent = edge.accentColor || "var(--evidra-cyan)";

            return (
              <g key={`signal-${edge.id}`}>
                {/* Trail Dot 2 (Tail) */}
                <motion.circle
                  r={1.8}
                  fill={accent}
                  opacity={0.25}
                  animate={{
                    cx: keyframes.cxKeyframes,
                    cy: keyframes.cyKeyframes,
                  }}
                  transition={{
                    duration,
                    repeat: Infinity,
                    repeatDelay: 3.8,
                    delay: delay + 0.14,
                    ease: "linear",
                  }}
                />

                {/* Trail Dot 1 (Mid) */}
                <motion.circle
                  r={2.8}
                  fill={accent}
                  opacity={0.55}
                  animate={{
                    cx: keyframes.cxKeyframes,
                    cy: keyframes.cyKeyframes,
                  }}
                  transition={{
                    duration,
                    repeat: Infinity,
                    repeatDelay: 3.8,
                    delay: delay + 0.07,
                    ease: "linear",
                  }}
                />

                {/* Lead Glowing Signal Comet Head */}
                <motion.circle
                  r={4}
                  fill={accent}
                  style={{
                    filter: "drop-shadow(0 0 6px var(--evidra-cyan))",
                  }}
                  animate={{
                    cx: keyframes.cxKeyframes,
                    cy: keyframes.cyKeyframes,
                  }}
                  transition={{
                    duration,
                    repeat: Infinity,
                    repeatDelay: 3.8,
                    delay,
                    ease: "linear",
                  }}
                />
              </g>
            );
          })}

        {/* ----------------------------------------------------------------- */}
        {/* 4. Sonar Ping Bursts on Satellite Nodes                           */}
        {/* ----------------------------------------------------------------- */}
        {!reducedMotion && (
          <>
            {/* Ping on A1 */}
            <motion.circle
              cx={312.3}
              cy={182.5}
              fill="none"
              stroke="var(--evidra-violet)"
              strokeWidth={1.5}
              initial={{ r: 8, opacity: 0.7 }}
              animate={{ r: 24, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatDelay: 3.5,
                delay: 0.5,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "312.3px 182.5px" }}
            />

            {/* Ping on A4 */}
            <motion.circle
              cx={147.7}
              cy={277.5}
              fill="none"
              stroke="var(--evidra-green)"
              strokeWidth={1.5}
              initial={{ r: 8, opacity: 0.7 }}
              animate={{ r: 24, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatDelay: 4.2,
                delay: 2.1,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "147.7px 277.5px" }}
            />

            {/* Ping on B3 */}
            <motion.circle
              cx={304.0}
              cy={388.6}
              fill="none"
              stroke="var(--evidra-amber)"
              strokeWidth={1.5}
              initial={{ r: 6, opacity: 0.7 }}
              animate={{ r: 22, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatDelay: 3.8,
                delay: 3.6,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "304px 388.6px" }}
            />
          </>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 5. Satellite Nodes (Ring A, Ring B, Outliers)                    */}
        {/* ----------------------------------------------------------------- */}
        <g>
          {allNodes.map((node) => {
            if (node.id === "hub") return null;

            return (
              <g key={node.id}>
                {node.isHollow ? (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill="none"
                    stroke={node.colorVar}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                ) : (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={node.colorVar}
                      stroke="var(--evidra-bg)"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={Math.max(1.5, node.r - 3)}
                      fill="var(--evidra-surface)"
                      opacity={0.9}
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* 6. Active Hub Radar / Scanner Center                              */}
        {/* ----------------------------------------------------------------- */}
        <g key="hub-group">
          {/* Outer Dashed Scanner Ring 2 (Clockwise) */}
          <motion.circle
            cx={230}
            cy={230}
            r={34}
            fill="none"
            stroke="var(--evidra-cyan)"
            strokeWidth={1}
            strokeDasharray="2 6"
            opacity={0.3}
            animate={reducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "230px 230px" }}
          />

          {/* Inner Dashed Scanner Ring 1 (Counter-Clockwise) */}
          <motion.circle
            cx={230}
            cy={230}
            r={24}
            fill="none"
            stroke="var(--evidra-cyan)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.45}
            animate={reducedMotion ? undefined : { rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "230px 230px" }}
          />

          {/* Solid Glowing Core Node */}
          <motion.circle
            cx={230}
            cy={230}
            r={14}
            fill="var(--evidra-cyan)"
            style={{
              filter: "drop-shadow(0 0 10px rgba(47, 95, 224, 0.45))",
              transformOrigin: "230px 230px",
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    scale: [1, 1.08, 1],
                    opacity: [1, 0.88, 1],
                  }
            }
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* White Core Target Center Dot */}
          <circle cx={230} cy={230} r={4} fill="var(--evidra-surface)" />
        </g>
      </svg>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Floating Monospace Evidence Tag Chip (Cross-Fading Cycle)        */}
      {/* ----------------------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tagIndex}
            style={{
              position: "absolute",
              left: `${(currentTag.x / 460) * 100}%`,
              top: `${(currentTag.y / 460) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={reducedMotion ? { opacity: 0.9 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2.5 py-1 text-[9.5px] font-mono font-semibold uppercase tracking-wider text-text-dim shadow-xs backdrop-blur-xs whitespace-nowrap"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--evidra-cyan)]" />
            {currentTag.text}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
