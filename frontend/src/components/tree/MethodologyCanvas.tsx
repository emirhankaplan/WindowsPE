'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Filter, Loader2, ServerCrash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { useTree } from '@/features/methodology/hooks';
import {
  nodeMatchesFilters,
  selectActiveFilterCount,
  selectFilters,
  selectShowLinks,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useFilterUrlSync } from '@/features/methodology/use-filter-url-sync';
import type { Methodology } from '@/features/methodology/types';
import { layoutGraph } from '@/lib/layout-engine';

import { FilterBar } from './FilterBar';
import { PhaseLegend } from './PhaseLegend';
import { PhaseNode, type PhaseNodeData } from './PhaseNode';
import { TechniqueNode, type TechniqueNodeData } from './TechniqueNode';

const nodeTypes = {
  phase: PhaseNode,
  technique: TechniqueNode,
};

// `animated: true` adds the `.animated` class — globals.css slows the
// React Flow dash cycle to 3s and tints it to the accent ramp so the
// effect reads as flow, not loading.
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
} as const;

// Minimap fill ramp. Explicit hex (not CSS vars) — the minimap paints SVG
// rects and we want the colour resolved regardless of cascade context.
const SEVERITY_HEX: Record<string, string> = {
  info: '#5B9AC4',
  low: '#5BE5C0',
  medium: '#FFD84D',
  high: '#FF8A3D',
  critical: '#FF3B5C',
};

function minimapNodeColor(n: Node): string {
  if (n.type === 'phase') return 'rgba(91,229,192,0.9)';
  const data = n.data as Partial<TechniqueNodeData> | undefined;
  const severity = data?.node?.severity;
  return (severity && SEVERITY_HEX[severity]) || 'rgba(156,163,175,0.7)';
}

export function MethodologyCanvas() {
  const { data, isLoading, isError, error, refetch } = useTree();
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const showLinks = useMethodologyStore(selectShowLinks);
  const selectedNodeId = useMethodologyStore((s) => s.selectedNodeId);
  const setFocusPath = useMethodologyStore((s) => s.setFocusPath);
  const filters = useMethodologyStore(selectFilters);
  const activeFilterCount = useMethodologyStore(selectActiveFilterCount);
  const clearFilters = useMethodologyStore((s) => s.clearFilters);
  const router = useRouter();

  // Keep the canvas filters mirrored in the URL query string (shareable view).
  useFilterUrlSync();

  // Adjacency for focus mode — parent lookup + children buckets, memoised on
  // the data alone (cheap; rebuilt only when the tree changes).
  const adjacency = useMemo(() => {
    const parentOf = new Map<string, string | null>();
    const childrenOf = new Map<string, string[]>();
    const phaseOf = new Map<string, string>();
    if (data) {
      for (const n of data.nodes) {
        parentOf.set(n.id, n.parent_id);
        phaseOf.set(n.id, n.phase_id);
        if (n.parent_id) {
          const arr = childrenOf.get(n.parent_id) ?? [];
          arr.push(n.id);
          childrenOf.set(n.parent_id, arr);
        }
      }
    }
    return { parentOf, childrenOf, phaseOf };
  }, [data]);

  // Recompute the focus lineage whenever the selection (or tree) changes:
  // ancestors → self → direct children, plus the owning phase anchor.
  useEffect(() => {
    if (!selectedNodeId || !adjacency.parentOf.has(selectedNodeId)) {
      setFocusPath([]);
      return;
    }
    const path = new Set<string>([selectedNodeId]);
    let cursor: string | null = selectedNodeId;
    const guard = new Set<string>(); // cycle guard, just in case
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const parent: string | null = adjacency.parentOf.get(cursor) ?? null;
      if (parent) path.add(parent);
      cursor = parent;
    }
    for (const child of adjacency.childrenOf.get(selectedNodeId) ?? []) {
      path.add(child);
    }
    const phaseId = adjacency.phaseOf.get(selectedNodeId);
    if (phaseId) path.add(`phase:${phaseId}`);
    setFocusPath([...path]);
  }, [selectedNodeId, adjacency, setFocusPath]);

  // Tree layout depends only on the data — the dagre pass (child edges only)
  // is memoised so toggling the relationship overlay never re-lays-out.
  const laidOut = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };
    const built = buildGraph(data);
    return layoutGraph(built.nodes, built.edges, { direction: 'LR' });
  }, [data]);

  // Count how many technique nodes survive the active filter facets.
  // We only do this when there are active filters to avoid re-computing on
  // every render in the common (no-filter) case.
  const visibleNodeCount = useMemo(() => {
    if (!data || activeFilterCount === 0) return -1; // -1 = "don't show empty state"
    return data.nodes.filter((n) => nodeMatchesFilters(n, filters)).length;
  }, [data, filters, activeFilterCount]);

  // Relationship edges (prerequisite / related) are drawn *on top* of the
  // already-positioned nodes — never fed to dagre, so they can't distort the
  // primary tree narrative.
  const linkEdges = useMemo(() => (data ? buildLinkEdges(data) : []), [data]);

  const nodes = laidOut.nodes;
  const edges = useMemo(
    () => (showLinks ? [...laidOut.edges, ...linkEdges] : laidOut.edges),
    [showLinks, laidOut.edges, linkEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Phase anchors are non-interactive; clicking them does nothing.
      if (node.type === 'phase') return;
      // Optimistic store update so the panel opens on the same tick, then
      // push the URL so the link is shareable / back-button-friendly.
      selectNode(node.id);
      router.push(`/node/${encodeURIComponent(node.id)}`);
    },
    [selectNode, router],
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-3 text-fg-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="font-mono text-xs uppercase tracking-wider">
            loading methodology…
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="max-w-md rounded-card border border-severity-critical/40 bg-panel p-6 shadow-panel">
          <div className="flex items-center gap-2 text-severity-critical">
            <ServerCrash className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wider">
              backend unreachable
            </span>
          </div>
          <p className="mt-2 text-sm text-fg-secondary">
            {error?.message ?? 'Unknown error contacting the WindowsPE API.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-pill border border-subtle bg-elevated px-3 py-1 text-xs text-fg transition-colors hover:border-accent hover:text-accent"
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      // The interactive node lives inside our custom `TechniqueNode`
      // (`role="button"` + `tabIndex`), so we suppress React Flow's own
      // node-wrapper focus to avoid a duplicate tab stop per card.
      nodesFocusable={false}
      edgesFocusable={false}
      proOptions={{ hideAttribution: true }}
      className="!bg-canvas"
      // Mobile touch support: enable pan-on-drag, pinch-to-zoom, and
      // scroll-to-zoom on all viewports. panOnDrag true for touch panning.
      panOnDrag
      panOnScroll={false}
      zoomOnPinch
      zoomOnScroll
      zoomOnDoubleClick
      // Prevent text selection during touch-pan
      preventScrolling
    >
      <Panel position="top-left" className="!m-3">
        <FilterBar />
      </Panel>
      <Panel position="bottom-left" className="!mb-3 !ml-3">
        <PhaseLegend />
      </Panel>

      {/* All-filtered-out empty state — shows when active filters leave zero
          visible nodes. The canvas is still rendered (pan/zoom stays intact)
          but an informative overlay appears so the user knows why it looks empty. */}
      {visibleNodeCount === 0 && (
        <Panel position="top-center" className="!pointer-events-auto !top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-panel/90 p-6 text-center shadow-pop backdrop-blur-md">
            <Filter className="h-6 w-6 text-fg-muted" />
            <div>
              <p className="text-sm font-medium text-fg">No techniques match</p>
              <p className="mt-1 text-xs text-fg-secondary">
                The active filters hide all {data?.nodes.length ?? 0} nodes.
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-pill border border-hairline bg-elevated px-3 py-1.5 text-xs text-fg-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Clear all filters
            </button>
          </div>
        </Panel>
      )}
      <Background
        variant={BackgroundVariant.Dots}
        color="rgba(255,255,255,0.05)"
        gap={32}
        size={1}
      />
      <Controls
        position="top-right"
        showInteractive={false}
        className="!rounded-card !border !border-hairline !bg-panel !shadow-panel [&_button]:!border-hairline [&_button]:!bg-panel [&_button]:!text-fg-secondary [&_button:hover]:!bg-elevated [&_button:hover]:!text-accent [&_button]:!h-10 [&_button]:!w-10 sm:[&_button]:!h-8 sm:[&_button]:!w-8"
      />
      {/* MiniMap hidden on small screens — saves space, canvas pan/pinch sufficient */}
      <MiniMap
        pannable
        zoomable
        ariaLabel="Methodology minimap"
        className="!hidden !rounded-card !border !border-hairline !bg-panel/90 !backdrop-blur-sm sm:!block"
        maskColor="rgba(10,11,15,0.75)"
        nodeColor={minimapNodeColor}
        nodeStrokeWidth={0}
      />
    </ReactFlow>
  );
}

// ---------------------------------------------------------------------------
// Graph assembly
// ---------------------------------------------------------------------------

interface BuiltGraph {
  nodes: Node[];
  edges: Edge[];
}

function buildGraph(m: Methodology): BuiltGraph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Count children per phase for the anchor badge.
  const childCount = new Map<string, number>();
  for (const n of m.nodes) {
    childCount.set(n.phase_id, (childCount.get(n.phase_id) ?? 0) + 1);
  }

  // The Start Here node is the first top-level technique of the lowest-ordinal
  // phase. Backend already orders by (phase_id, ordinal, id), so the first
  // match in source order is the right one.
  const startNodeId = computeStartNodeId(m);

  // Phase anchors
  for (const p of m.phases) {
    const data: PhaseNodeData = {
      title: p.title,
      ordinal: p.ordinal,
      icon: p.icon,
      nodeCount: childCount.get(p.id) ?? 0,
    };
    nodes.push({
      id: phaseAnchorId(p.id),
      type: 'phase',
      data,
      position: { x: 0, y: 0 },
    });
  }

  // Content nodes
  for (const n of m.nodes) {
    const data: TechniqueNodeData = {
      node: n,
      isStart: n.id === startNodeId,
    };
    nodes.push({
      id: n.id,
      type: 'technique',
      data,
      position: { x: 0, y: 0 },
    });
  }

  // Implicit phase → top-level edges (top-level = parent_id is null).
  for (const n of m.nodes) {
    if (n.parent_id) continue;
    edges.push({
      id: `e:${phaseAnchorId(n.phase_id)}->${n.id}`,
      source: phaseAnchorId(n.phase_id),
      target: n.id,
    });
  }

  // Explicit parent → child edges. We deliberately skip `prerequisite` and
  // `related` here — they create cross-cutting links that confuse dagre
  // and aren't part of the primary tree narrative. They surface in the
  // side-panel as chips instead.
  for (const e of m.edges) {
    if (e.kind !== 'child') continue;
    edges.push({
      id: `e:${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
    });
  }

  return { nodes, edges };
}

/**
 * Cross-cutting relationship edges (prerequisite / related) drawn over the
 * laid-out tree when the overlay is enabled. Styled distinctly from the tree:
 *   - prerequisite → violet, arrowed (directional: source is needed first)
 *   - related      → cyan, dashed, no arrow (symmetric "see also")
 * `zIndex` lifts them above the child edges; ids are namespaced so they never
 * collide with the tree edge ids.
 */
function buildLinkEdges(m: Methodology): Edge[] {
  // Only draw links between nodes that actually exist as cards on the canvas.
  const present = new Set(m.nodes.map((n) => n.id));
  const out: Edge[] = [];

  for (const e of m.edges) {
    if (e.kind === 'child') continue;
    if (!present.has(e.source) || !present.has(e.target)) continue;

    const isPrereq = e.kind === 'prerequisite';
    out.push({
      id: `link:${e.kind}:${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: 'bezier',
      animated: false,
      zIndex: 5,
      style: {
        stroke: isPrereq ? 'var(--color-accent-alt)' : 'var(--color-accent)',
        strokeWidth: 1.5,
        strokeDasharray: isPrereq ? undefined : '5 5',
        opacity: 0.55,
      },
      markerEnd: isPrereq
        ? { type: MarkerType.ArrowClosed, color: 'var(--color-accent-alt)', width: 14, height: 14 }
        : undefined,
    });
  }

  return out;
}

function phaseAnchorId(phaseId: string): string {
  return `phase:${phaseId}`;
}

function computeStartNodeId(m: Methodology): string | null {
  const firstPhase = [...m.phases].sort((a, b) => a.ordinal - b.ordinal)[0];
  if (!firstPhase) return null;
  for (const n of m.nodes) {
    if (n.phase_id === firstPhase.id && n.parent_id == null) {
      return n.id;
    }
  }
  return null;
}
