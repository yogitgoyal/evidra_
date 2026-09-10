"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import cytoscape, { Core, NodeSingular, EdgeSingular } from "cytoscape";
// @ts-expect-error -- cytoscape-fcose has no types
import fcose from "cytoscape-fcose";
import { Entity, EntityType, GraphEdge } from "@/lib/types";
import { riskColorHex } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

// Register cytoscape-fcose plugin safely
if (typeof cytoscape !== "undefined" && typeof fcose !== "undefined") {
  try {
    cytoscape.use(fcose);
  } catch {
    // Already registered
  }
}

export const entityColorMap2D: Record<
  EntityType,
  { base: string; highlight: string; dark: string; label: string }
> = {
  person: {
    base: "#16a34a",
    highlight: "#bbf7d0",
    dark: "#14532d",
    label: "Person / Subject",
  },
  phone: {
    base: "#9333ea",
    highlight: "#f5d0fe",
    dark: "#581c87",
    label: "Phone / SIM",
  },
  sim: {
    base: "#9333ea",
    highlight: "#f5d0fe",
    dark: "#581c87",
    label: "SIM Record",
  },
  device: {
    base: "#ea580c",
    highlight: "#ffedd5",
    dark: "#7c2d12",
    label: "Hardware / IP",
  },
  ip: {
    base: "#ea580c",
    highlight: "#ffedd5",
    dark: "#7c2d12",
    label: "IP Address",
  },
  account: {
    base: "#2563eb",
    highlight: "#dbeafe",
    dark: "#1e3a8a",
    label: "Bank Account",
  },
  upi: {
    base: "#2563eb",
    highlight: "#dbeafe",
    dark: "#1e3a8a",
    label: "UPI Handle",
  },
  tower: {
    base: "#475569",
    highlight: "#f1f5f9",
    dark: "#0f172a",
    label: "Cell Tower",
  },
  location: {
    base: "#475569",
    highlight: "#f1f5f9",
    dark: "#0f172a",
    label: "Location",
  },
  social: {
    base: "#dc2626",
    highlight: "#fee2e2",
    dark: "#7f1d1d",
    label: "Social Profile",
  },
  vehicle: {
    base: "#0f766e",
    highlight: "#ccfbf1",
    dark: "#134e4a",
    label: "Vehicle",
  },
};

export function InvestigationGraph({
  onSelect,
  filterTypes,
  entities,
  edges,
}: {
  onSelect: (e: Entity | null) => void;
  filterTypes: Set<EntityType>;
  entities: Entity[];
  edges: GraphEdge[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const destroyedRef = useRef<boolean>(false);
  const onSelectRef = useRef(onSelect);

  const [, setHoveredNode] = useState<Entity | null>(null);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const [isLayoutRunning, setIsLayoutRunning] = useState<boolean>(false);
  const selectedNodeRef = useRef<Entity | null>(null);

  // Active filtered nodes & edges
  const activeEntities = useMemo(
    () => entities.filter((e) => filterTypes.has(e.type)),
    [filterTypes]
  );

  const activeEdges = useMemo(() => {
    const ids = new Set(activeEntities.map((e) => e.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [activeEntities]);

  const denseNodeIds = useMemo(() => {
    const degrees = new Map<string, number>();
    activeEdges.forEach((edge) => {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
    });
    return new Set(
      [...degrees.entries()]
        .filter(([, degree]) => degree >= 4)
        .map(([nodeId]) => nodeId),
    );
  }, [activeEdges]);

  // Convert case data to Cytoscape elements with hex colors
  const elements = useMemo(() => {
    const nodes = activeEntities.map((e) => {
      const typeColors = entityColorMap2D[e.type] || entityColorMap2D.tower;
      const borderHex = riskColorHex(e.risk);
      const nodeSize = Math.max(26, Math.pow(e.risk / 100, 1.3) * 26 + 26);

      return {
        data: {
          id: e.id,
          label: e.label,
          sublabel: e.sublabel,
          type: e.type,
          risk: e.risk,
          confidence: e.confidence,
          colorBase: typeColors.base,
          colorBorder: borderHex,
          nodeSize: nodeSize,
        },
      };
    });

    const links = activeEdges.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        kind: e.kind,
        edgeLabel: e.kind === "POSSIBLE_SAME_IDENTIFIER" ? "Possible Same Identity" : e.kind,
        labelVisible: !denseNodeIds.has(e.source) && !denseNodeIds.has(e.target),
        confidence: e.confidence,
        weight: e.weight,
      },
    }));

    return [...nodes, ...links];
  }, [activeEntities, activeEdges, denseNodeIds]);
  const elementsRef = useRef(elements);

  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedNodeRef.current = selectedNode;
    elementsRef.current = elements;
  }, [elements, onSelect, selectedNode]);

  // Run layout on demand using local scoping to avoid strict-mode double-run leaks
  const runLayout = useCallback(() => {
    if (destroyedRef.current || !cyRef.current || cyRef.current.destroyed()) return;

    setIsLayoutRunning(true);

    const layout = cyRef.current.layout({
      name: "fcose",
      animate: true,
      animationDuration: 1200,
      fit: true,
      padding: 60,
      nodeDimensionsIncludeLabels: true,
      nodeRepulsion: (node: NodeSingular) => {
        const risk = (node.data("risk") as number) || 20;
        return 6500 + risk * 40;
      },
      idealEdgeLength: (edge: EdgeSingular) => {
        return edge.data("confidence") === "ambiguous" ? 150 : 120;
      },
      avoidOverlap: true,
      nodeSpacing: (node: NodeSingular) => {
        const risk = (node.data("risk") as number) || 20;
        return 60 + risk / 3;
      },
      packComponents: true,
      randomize: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    layout.one("layoutstop", () => {
      if (destroyedRef.current) return;
      setIsLayoutRunning(false);
      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.fit(undefined, 60);
      }
    });

    layout.run();
  }, []);

  // Initialize Cytoscape core instance
  useEffect(() => {
    destroyedRef.current = false;
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container: container,
      elements: elementsRef.current,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(colorBase)",
            "border-color": "data(colorBorder)",
            "border-width": 3,
            width: "data(nodeSize)",
            height: "data(nodeSize)",
            label: "data(label)",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "font-size": 11,
            "font-family": "JetBrains Mono, monospace",
            "font-weight": "bold",
            color: "#334155",
            "text-wrap": "ellipsis",
            "text-max-width": "110px",
            "transition-property": "opacity, border-color, border-width, width, height",
            "transition-duration": 0.2,
          },
        },
        {
          selector: "edge",
          style: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            width: (e: any) => (e.data("confidence") === "ambiguous" ? 1.5 : 2.5),
            "line-color": "#334155",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            "line-style": (e: any) => (e.data("confidence") === "ambiguous" ? "dashed" : "solid"),
            "curve-style": "bezier",
            label: (edge: EdgeSingular) =>
              edge.data("labelVisible") ? edge.data("edgeLabel") : "",
            "font-size": 8.5,
            "font-family": "JetBrains Mono, monospace",
            "font-weight": "bold",
            color: "#475569",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.95,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "text-border-color": "#cbd5e1",
            "text-border-width": 1,
            "text-border-opacity": 0.8,
            "text-rotation": "autorotate",
            "transition-property": "opacity, line-color, width",
            "transition-duration": 0.2,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#2563eb",
            "border-width": 5,
          },
        },
      ],
    });

    cyRef.current = cy;

    // Hover & Selection interactions: Spotlight connected neighborhood
    const highlightNeighborhood = (node: cytoscape.NodeSingular) => {
      if (destroyedRef.current || cy.destroyed()) return;
      const targetId = node.id();

      const neighborhood = node.neighborhood().add(node);
      const nonNeighbors = cy.elements().difference(neighborhood);

      // Spotlight: fade unrelated elements to 15% opacity
      nonNeighbors.style("opacity", 0.15);
      neighborhood.style("opacity", 1.0);

      // Recolor direct edges (Red for outgoing/upstream, Green for incoming/downstream)
      node.connectedEdges().forEach((edge) => {
        if (edge.source().id() === targetId) {
          edge.style({ "line-color": "#ef4444", width: 3.5, opacity: 1.0 });
        } else {
          edge.style({ "line-color": "#22c55e", width: 3.5, opacity: 1.0 });
        }
        edge.style("label", edge.data("edgeLabel"));
      });
    };

    const resetHighlight = () => {
      if (destroyedRef.current || cy.destroyed()) return;
      cy.elements().style("opacity", 1.0);
      cy.edges().forEach((edge) => {
        edge.style({
          "line-color": "#334155",
          width: edge.data("confidence") === "ambiguous" ? 1.5 : 2.5,
        });
        edge.style("label", edge.data("labelVisible") ? edge.data("edgeLabel") : "");
      });
    };

    cy.on("tap", "node", (evt) => {
      if (destroyedRef.current || cy.destroyed()) return;
      const node = evt.target;
      const entity = entities.find((e) => e.id === node.id()) ?? null;
      setSelectedNode(entity);
      onSelectRef.current(entity);
      highlightNeighborhood(node);
    });

    cy.on("mouseover", "node", (evt) => {
      if (destroyedRef.current || cy.destroyed()) return;
      const node = evt.target;
      const entity = entities.find((e) => e.id === node.id()) ?? null;
      setHoveredNode(entity);
      highlightNeighborhood(node);
    });

    cy.on("mouseover", "edge", (evt) => {
      if (destroyedRef.current || cy.destroyed()) return;
      evt.target.style("label", evt.target.data("edgeLabel"));
    });

    cy.on("mouseout", "edge", (evt) => {
      if (destroyedRef.current || cy.destroyed()) return;
      const edge = evt.target;
      edge.style("label", edge.data("labelVisible") ? edge.data("edgeLabel") : "");
    });

    cy.on("mouseout", "node", () => {
      if (destroyedRef.current || cy.destroyed()) return;
      setHoveredNode(null);
      if (!selectedNodeRef.current) {
        resetHighlight();
      }
    });

    cy.on("tap", (evt) => {
      if (destroyedRef.current || cy.destroyed()) return;
      if (evt.target === cy) {
        setSelectedNode(null);
        onSelectRef.current(null);
        resetHighlight();
      }
    });

    // Run layout inside local effect closure safely
    setIsLayoutRunning(true);
    const layout = cy.layout({
      name: "fcose",
      animate: true,
      animationDuration: 1200,
      fit: true,
      padding: 60,
      nodeDimensionsIncludeLabels: true,
      nodeRepulsion: (node: NodeSingular) => {
        const risk = (node.data("risk") as number) || 20;
        return 6500 + risk * 40;
      },
      idealEdgeLength: (edge: EdgeSingular) => {
        return edge.data("confidence") === "ambiguous" ? 150 : 120;
      },
      avoidOverlap: true,
      nodeSpacing: (node: NodeSingular) => {
        const risk = (node.data("risk") as number) || 20;
        return 60 + risk / 3;
      },
      packComponents: true,
      randomize: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    layout.one("layoutstop", () => {
      if (destroyedRef.current || cy.destroyed()) return;
      setIsLayoutRunning(false);
      cy.fit(undefined, 60);
    });

    layout.run();

    return () => {
      destroyedRef.current = true;
      try {
        layout.stop();
      } catch {
        // ignore
      }
      if (!cy.destroyed()) {
        try {
          cy.destroy();
        } catch {
          // ignore
        }
      }
      cyRef.current = null;
    };
  }, []); // Run setup once on mount

  // Sync elements when active filters change
  useEffect(() => {
    if (destroyedRef.current || !cyRef.current || cyRef.current.destroyed()) return;

    cyRef.current.batch(() => {
      cyRef.current?.elements().remove();
      cyRef.current?.add(elements);
    });

    runLayout();
  }, [elements, runLayout]);

  return (
    <div className="relative h-full w-full min-w-0 flex-1 overflow-hidden bg-[#f8fafc] select-none">
      <div ref={containerRef} className="h-full w-full" />

      {/* Manual Layout Control Overlay */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={runLayout}
          disabled={isLayoutRunning}
          className="flex items-center gap-1.5 rounded-xl border border-border-soft bg-surface/90 px-3 py-1.5 text-xs font-semibold text-text shadow-sm backdrop-blur-md transition-all hover:bg-surface-2 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLayoutRunning ? "animate-spin text-cyan" : "text-cyan"} />
          <span>{isLayoutRunning ? "Arranging…" : "Re-arrange Graph"}</span>
        </button>
      </div>
    </div>
  );
}
