"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition, NodeSingular } from "cytoscape";
// @ts-expect-error -- cytoscape-fcose has no types
import fcose from "cytoscape-fcose";
import type { FinancialFlowLink, FinancialFlowNode } from "@/lib/types";

if (typeof cytoscape !== "undefined" && typeof fcose !== "undefined") {
  cytoscape.use(fcose);
}

const nodeColors = ["#2f5fe0", "#7c53e0", "#d97a06", "#16874f"];
type FinancialTransaction = Record<string, string | number>;

export function FinancialFlowGraph({
  nodes,
  links,
  transactions,
}: {
  nodes: FinancialFlowNode[];
  links: FinancialFlowLink[];
  transactions: FinancialTransaction[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    details: string[];
  } | null>(null);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements = nodes.map((node, index) => ({
      data: {
        id: node.id,
        label: node.label,
        color: nodeColors[index % nodeColors.length],
      },
    }));
    const edgeElements = links.map((link, index) => {
      const source = nodes.find((node) => node.id === link.source);
      const target = nodes.find((node) => node.id === link.target);
      const transaction = transactions.find(
        (item) => String(item.from) === source?.label && String(item.to) === target?.label
      );

      return {
        data: {
          id: `financial-link-${index}`,
          source: link.source,
          target: link.target,
          label: `₹${link.value.toLocaleString("en-IN")}`,
          amount: link.value,
          channel: transaction?.channel ?? "Unknown",
          evidenceId: link.evidenceIds[0] ?? transaction?.evidenceId ?? "—",
          sourceLabel: source?.label ?? link.source,
          targetLabel: target?.label ?? link.target,
        },
      };
    });

    return [...nodeElements, ...edgeElements];
  }, [links, nodes, transactions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            "border-color": "data(color)",
            "border-width": 3,
            width: 34,
            height: 34,
            label: "data(label)",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "font-size": 11,
            "font-family": "JetBrains Mono, monospace",
            "font-weight": "bold",
            color: "#334155",
            "text-wrap": "ellipsis",
            "text-max-width": "150px",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2.5,
            "line-color": "#2f5fe0",
            "target-arrow-color": "#2f5fe0",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 10,
            "font-family": "JetBrains Mono, monospace",
            "font-weight": "bold",
            color: "#334155",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.95,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "text-border-color": "#cbd5e1",
            "text-border-width": 1,
            "text-border-opacity": 0.8,
            "text-rotation": "autorotate",
          },
        },
      ],
    });

    cyRef.current = cy;
    const showNodeTooltip = (node: NodeSingular) => {
      const relatedEdge = node.connectedEdges()[0];
      const details = relatedEdge
        ? [
            `${relatedEdge.data("sourceLabel")} → ${relatedEdge.data("targetLabel")}`,
            `Amount: ₹${Number(relatedEdge.data("amount")).toLocaleString("en-IN")}`,
            `Channel: ${relatedEdge.data("channel")}`,
            `Evidence: ${relatedEdge.data("evidenceId")}`,
          ]
        : [];
      const rendered = node.renderedPosition();
      setTooltip({ x: rendered.x + 18, y: rendered.y - 18, title: node.data("label"), details });
    };
    const showEdgeTooltip = (edge: cytoscape.EdgeSingular) => {
      const rendered = edge.renderedMidpoint();
      setTooltip({
        x: rendered.x + 18,
        y: rendered.y - 18,
        title: `${edge.data("sourceLabel")} → ${edge.data("targetLabel")}`,
        details: [
          `Amount: ₹${Number(edge.data("amount")).toLocaleString("en-IN")}`,
          `Channel: ${edge.data("channel")}`,
          `Evidence: ${edge.data("evidenceId")}`,
        ],
      });
    };

    cy.on("mouseover", "node", (event) => showNodeTooltip(event.target));
    cy.on("mouseover", "edge", (event) => showEdgeTooltip(event.target));
    cy.on("mouseout", "node, edge", () => setTooltip(null));

    const layout = cy.layout({
      name: "fcose",
      animate: true,
      animationDuration: 800,
      randomize: true,
      packComponents: true,
      componentSpacing: 90,
      fit: true,
      padding: 60,
      nodeDimensionsIncludeLabels: true,
      nodeRepulsion: 6500,
      idealEdgeLength: 120,
      avoidOverlap: true,
      nodeSpacing: 60,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    layout.run();

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg bg-[#f8fafc]">
      <div ref={containerRef} className="h-full w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-border-soft bg-surface/95 px-3 py-2 text-[11px] text-text shadow-md"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-text">{tooltip.title}</div>
          {tooltip.details.map((detail) => (
            <div key={detail} className="mt-0.5 font-mono text-text-dim">{detail}</div>
          ))}
        </div>
      )}
    </div>
  );
}
