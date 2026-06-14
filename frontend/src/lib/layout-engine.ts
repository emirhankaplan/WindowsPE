/**
 * Dagre-driven auto-layout for the methodology graph.
 *
 * We keep dagre behind this module so the canvas component stays declarative
 * and we can swap to ELK later without touching the React layer.
 */

import dagre from 'dagre';
import { Position, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';

export type LayoutDirection = 'LR' | 'TB';

const PHASE_NODE_WIDTH = 300;
const PHASE_NODE_HEIGHT = 88;
const TECHNIQUE_NODE_WIDTH = 280;
const TECHNIQUE_NODE_HEIGHT = 108;

interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSeparation?: number;
  rankSeparation?: number;
}

export function layoutGraph(
  nodes: RFNode[],
  edges: RFEdge[],
  options: LayoutOptions = {},
): { nodes: RFNode[]; edges: RFEdge[] } {
  const direction = options.direction ?? 'LR';
  const isHorizontal = direction === 'LR';

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: options.nodeSeparation ?? 48,
    ranksep: options.rankSeparation ?? 140,
    marginx: 64,
    marginy: 64,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const { width, height } = dimsFor(node);
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
  const targetPosition = isHorizontal ? Position.Left : Position.Top;

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      const { width, height } = dimsFor(n);
      // dagre fills these in during layout but @types/dagre marks them
      // optional; default to 0 so we degrade gracefully if a node is
      // orphaned from the layout for any reason.
      const cx = pos?.x ?? 0;
      const cy = pos?.y ?? 0;
      return {
        ...n,
        sourcePosition,
        targetPosition,
        position: {
          x: cx - width / 2,
          y: cy - height / 2,
        },
      };
    }),
    edges,
  };
}

function dimsFor(n: RFNode): { width: number; height: number } {
  if (n.type === 'phase') {
    return { width: PHASE_NODE_WIDTH, height: PHASE_NODE_HEIGHT };
  }
  return { width: TECHNIQUE_NODE_WIDTH, height: TECHNIQUE_NODE_HEIGHT };
}
