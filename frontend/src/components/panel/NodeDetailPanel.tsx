'use client';

import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  MinusCircle,
  ServerCrash,
  Tag as TagIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { copyToClipboard } from '@/features/snippets/clipboard';
import { applyVars } from '@/features/snippets/substitute';
import { useNode, useTree } from '@/features/methodology/hooks';
import {
  selectPanelOpen,
  selectSelectedNodeId,
  selectVars,
  useMethodologyStore,
} from '@/features/methodology/store';
import type { NodeDetail, NodeRef, ProgressStatus } from '@/features/methodology/types';
import { mitreUrl } from '@/lib/mitre';
import { cn } from '@/lib/utils';

import { AddToPlaybookButton } from './AddToPlaybookButton';
import { FavoriteButton } from './FavoriteButton';
import { MarkdownBody } from './MarkdownBody';
import { NoteEditor } from './NoteEditor';
import { ReferenceList } from './ReferenceList';
import { DifficultyBadge, SeverityBadge } from './SeverityBadge';
import { SnippetBlock } from './SnippetBlock';
import { Sheet } from '@/components/ui/sheet';

export function NodeDetailPanel() {
  const selectedNodeId = useMethodologyStore(selectSelectedNodeId);
  const panelOpen = useMethodologyStore(selectPanelOpen);
  const closePanel = useMethodologyStore((s) => s.closePanel);
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const pushRecent = useMethodologyStore((s) => s.pushRecent);
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useNode(selectedNodeId);

  // Record the node in the recently-viewed list once its detail resolves —
  // this feeds the command palette's "recent" shortcuts.
  useEffect(() => {
    if (data?.id) pushRecent(data.id);
  }, [data?.id, pushRecent]);

  // Closing the panel pushes the URL back to `/`. The `/` page effect then
  // clears `selectedNodeId`. We also close the panel optimistically so the
  // slide-out animation starts immediately.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closePanel();
      router.push('/');
    }
  };

  // Cross-link navigation (prereq / related chips) — push the URL and let
  // the destination page effect sync the store. Optimistically call
  // selectNode so the panel content swaps immediately.
  const handleNavigate = (id: string) => {
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  return (
    <Sheet
      open={panelOpen}
      onOpenChange={handleOpenChange}
      title={data?.title ?? 'Node detail'}
      description={data?.summary}
      titleVisuallyHidden
    >
      {isLoading && <PanelLoading />}
      {isError && <PanelError message={error?.message} onRetry={() => refetch()} />}
      {data && <PanelBody node={data} onNavigate={handleNavigate} />}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function PanelLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-2 text-fg-secondary">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="font-mono text-xs uppercase tracking-wider">loading…</span>
      </div>
    </div>
  );
}

function PanelError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="rounded-card border border-severity-critical/40 bg-elevated p-6">
        <div className="flex items-center gap-2 text-severity-critical">
          <ServerCrash className="h-4 w-4" />
          <span className="font-mono text-xs uppercase tracking-wider">failed to load</span>
        </div>
        <p className="mt-2 text-sm text-fg-secondary">{message ?? 'Unknown error.'}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-pill border border-subtle bg-panel px-3 py-1 text-xs text-fg transition-colors hover:border-accent hover:text-accent"
        >
          retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main body
// ---------------------------------------------------------------------------

function PanelBody({
  node,
  onNavigate,
}: {
  node: NodeDetail;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Top severity stripe spanning the full panel width */}
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ backgroundColor: `var(--color-severity-${node.severity})` }}
      />

      <div className="px-8 pb-10 pt-8">
        <PhaseBreadcrumb node={node} />
        <Header node={node} />

        {/* Summary */}
        <p className="mt-4 text-base leading-relaxed text-fg-secondary">{node.summary}</p>

        {/* Description (markdown) */}
        {node.description_md && node.description_md.trim() !== '' && (
          <Section title="Description">
            <MarkdownBody source={node.description_md} />
          </Section>
        )}

        {/* Snippets */}
        {node.snippets.length > 0 && (
          <Section
            title="Commands"
            subtitle={`${node.snippets.length} snippet${node.snippets.length === 1 ? '' : 's'}`}
            action={node.snippets.length > 1 ? <CopyAllButton node={node} /> : undefined}
          >
            <div className="space-y-3">
              {node.snippets.map((s) => (
                <SnippetBlock key={s.id} snippet={s} />
              ))}
            </div>
          </Section>
        )}

        {/* Detection hints */}
        {node.detection_hints && (
          <Section title="Detection" icon={Eye}>
            <div className="rounded-card border border-hairline bg-elevated p-4">
              <MarkdownBody source={node.detection_hints} />
            </div>
          </Section>
        )}

        {/* References */}
        {node.references.length > 0 && (
          <Section title="References">
            <ReferenceList references={node.references} />
          </Section>
        )}

        {/* Cross-links */}
        {(node.prerequisites.length > 0 || node.related.length > 0) && (
          <Section title="Related">
            <div className="space-y-4">
              {node.prerequisites.length > 0 && (
                <NodeRefGroup
                  label="Prerequisites"
                  refs={node.prerequisites}
                  onNavigate={onNavigate}
                  accent="accent-alt"
                />
              )}
              {node.related.length > 0 && (
                <NodeRefGroup
                  label="See also"
                  refs={node.related}
                  onNavigate={onNavigate}
                  accent="accent"
                />
              )}
            </div>
          </Section>
        )}

        {/* Notes — personal scratchpad, persisted locally, feeds the export. */}
        <Section title="Notes">
          <NoteEditor key={node.id} nodeId={node.id} />
        </Section>

        {/* Progress */}
        <Section title="Progress">
          <ProgressControls nodeId={node.id} />
        </Section>

        {/* Walk through the phase */}
        <PhaseNav node={node} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase context — breadcrumb + intra-phase prev/next
// ---------------------------------------------------------------------------

/** Shared phase lookup: ordered nodes of the node's phase + the phase meta. */
function usePhaseContext(node: NodeDetail) {
  const { data: tree } = useTree();
  return useMemo(() => {
    if (!tree) return null;
    const phaseNodes = tree.nodes.filter((n) => n.phase_id === node.phase_id);
    const idx = phaseNodes.findIndex((n) => n.id === node.id);
    const phase = tree.phases.find((p) => p.id === node.phase_id);
    return {
      phaseTitle: phase?.title ?? node.phase_id,
      ordinal: phase?.ordinal ?? null,
      prev: idx > 0 ? phaseNodes[idx - 1] : null,
      next: idx >= 0 && idx < phaseNodes.length - 1 ? phaseNodes[idx + 1] : null,
      position: idx >= 0 ? idx + 1 : null,
      total: phaseNodes.length,
    };
  }, [tree, node.id, node.phase_id]);
}

function PhaseBreadcrumb({ node }: { node: NodeDetail }) {
  const ctx = usePhaseContext(node);
  return (
    <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
      {ctx?.ordinal != null && (
        <span className="text-accent">{String(ctx.ordinal).padStart(2, '0')}</span>
      )}
      <span className="truncate text-fg-secondary">{ctx?.phaseTitle ?? node.phase_id}</span>
      {ctx?.position != null && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="tabular-nums">
            {ctx.position}/{ctx.total}
          </span>
        </>
      )}
    </div>
  );
}

function PhaseNav({
  node,
  onNavigate,
}: {
  node: NodeDetail;
  onNavigate: (id: string) => void;
}) {
  const ctx = usePhaseContext(node);
  if (!ctx || (!ctx.prev && !ctx.next)) return null;

  return (
    <nav className="mt-10 flex items-stretch gap-3 border-t border-hairline pt-6">
      {ctx.prev ? (
        <button
          type="button"
          onClick={() => onNavigate(ctx.prev!.id)}
          className="group flex flex-1 items-center gap-2 rounded-card border border-hairline bg-elevated/50 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-elevated"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
          <span className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-fg-muted">
              previous
            </span>
            <span className="block truncate text-xs text-fg">{ctx.prev.title}</span>
          </span>
        </button>
      ) : (
        <span className="flex-1" />
      )}
      {ctx.next ? (
        <button
          type="button"
          onClick={() => onNavigate(ctx.next!.id)}
          className="group flex flex-1 items-center justify-end gap-2 rounded-card border border-hairline bg-elevated/50 px-3 py-2.5 text-right transition-colors hover:border-accent/40 hover:bg-elevated"
        >
          <span className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-fg-muted">
              next
            </span>
            <span className="block truncate text-xs text-fg">{ctx.next.title}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
        </button>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Copy-all-commands
// ---------------------------------------------------------------------------

function CopyAllButton({ node }: { node: NodeDetail }) {
  const [copied, setCopied] = useState(false);
  const vars = useMethodologyStore(selectVars);

  const handleCopy = async () => {
    // Join every snippet with a labelled comment header so the pasted block
    // is self-documenting in a terminal / notes file. Target-context vars are
    // substituted so the whole block is copy-paste-ready.
    const text = node.snippets
      .map(
        (s) =>
          `# ${s.title}${s.requires_admin ? ' (requires admin)' : ''}\n${applyVars(s.code, vars)}`,
      )
      .join('\n\n');
    if (await copyToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'All snippets copied to clipboard' : 'Copy all snippets to clipboard'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
        copied
          ? 'border-severity-low/40 text-severity-low'
          : 'border-hairline text-fg-secondary hover:border-accent hover:text-accent',
      )}
    >
      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'copied all' : 'copy all'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Header (title + badge row + tags)
// ---------------------------------------------------------------------------

function Header({ node }: { node: NodeDetail }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span>{node.kind}</span>
        {node.mitre_attack_id && (
          <>
            <span aria-hidden>·</span>
            {mitreUrl(node.mitre_attack_id) ? (
              <a
                href={mitreUrl(node.mitre_attack_id)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-alt transition-colors hover:text-accent-alt/80 hover:underline"
              >
                {node.mitre_attack_id}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="text-accent-alt">{node.mitre_attack_id}</span>
            )}
          </>
        )}
      </div>

      <h2 className="mt-2 pr-12 text-2xl font-semibold leading-tight tracking-tight text-fg">
        {node.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={node.severity} />
        <DifficultyBadge difficulty={node.difficulty} />
        {node.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-pill border border-hairline bg-elevated px-2 py-0.5 font-mono text-[10px] text-fg-secondary"
          >
            <TagIcon className="h-3 w-3" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
          {Icon && <Icon className="h-3 w-3" />}
          {title}
        </h3>
        {subtitle && (
          <span className="font-mono text-[10px] text-fg-muted">{subtitle}</span>
        )}
        <div className="ml-1 flex-1 border-t border-hairline" />
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Node ref chips (prerequisites / related)
// ---------------------------------------------------------------------------

function NodeRefGroup({
  label,
  refs,
  onNavigate,
  accent,
}: {
  label: string;
  refs: NodeRef[];
  onNavigate: (id: string) => void;
  accent: 'accent' | 'accent-alt';
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <ul className="flex flex-wrap gap-2">
        {refs.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onNavigate(r.id)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-elevated px-3 py-1.5 text-xs text-fg transition-colors',
                accent === 'accent'
                  ? 'hover:border-accent hover:text-accent'
                  : 'hover:border-accent-alt hover:text-accent-alt',
              )}
            >
              {r.title}
              <ArrowRight className="h-3 w-3 -translate-x-0.5 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress controls
// ---------------------------------------------------------------------------

function ProgressControls({ nodeId }: { nodeId: string }) {
  const progress = useMethodologyStore((s) => s.progress[nodeId]);
  const toggleProgress = useMethodologyStore((s) => s.toggleProgress);

  return (
    <div className="flex flex-wrap gap-2">
      <ProgressButton
        active={progress === 'done'}
        onClick={() => toggleProgress(nodeId, 'done')}
        icon={CheckCircle2}
        label="Mark done"
        activeLabel="Marked done"
        tone="done"
      />
      <ProgressButton
        active={progress === 'skipped'}
        onClick={() => toggleProgress(nodeId, 'skipped')}
        icon={MinusCircle}
        label="Skip"
        activeLabel="Skipped"
        tone="skipped"
      />
      <FavoriteButton nodeId={nodeId} />
      <AddToPlaybookButton nodeId={nodeId} />
      <p className="ml-auto self-center font-mono text-[10px] text-fg-muted">
        <AlertOctagon className="mr-1 inline h-3 w-3 -translate-y-px" />
        stored locally in your browser
      </p>
    </div>
  );
}

function ProgressButton({
  active,
  onClick,
  icon: Icon,
  label,
  activeLabel,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  activeLabel: string;
  tone: ProgressStatus;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `${activeLabel} — click to undo` : label}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs transition-colors',
        active
          ? tone === 'done'
            ? 'border-severity-low/40 bg-severity-low/10 text-severity-low'
            : 'border-fg-muted/40 bg-elevated text-fg'
          : 'border-hairline bg-elevated text-fg-secondary hover:border-subtle hover:text-fg',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {active ? activeLabel : label}
    </button>
  );
}
