'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Compass, RotateCcw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SeverityBadge } from '@/components/panel/SeverityBadge';
import { useTree } from '@/features/methodology/hooks';
import { selectWizardOpen, useMethodologyStore } from '@/features/methodology/store';

interface Option {
  label: string;
  next?: string;
  recommend?: string[];
}
interface Step {
  question: string;
  hint?: string;
  options: Option[];
}

/**
 * Static triage decision tree. Each option either advances to another step
 * (`next`) or yields a recommendation set (`recommend`, node ids). Node ids
 * are validated against the live tree before display, so stale ids are
 * silently dropped.
 */
const STEPS: Record<string, Step> = {
  start: {
    question: 'Have you enumerated the host yet?',
    hint: 'whoami /priv, systeminfo, and an automated sweep come first.',
    options: [
      { label: 'Not yet — where do I start?', recommend: ['auto-winpeas-exe', 'enum-systeminfo', 'user-whoami-all', 'priv-whoami-priv'] },
      { label: "Done — let's triage findings", next: 'privs' },
    ],
  },
  privs: {
    question: 'Does `whoami /priv` list any of these (even Disabled)?',
    options: [
      { label: 'SeImpersonate / SeAssignPrimaryToken', recommend: ['priv-se-impersonate', 'priv-potato-god', 'priv-potato-print', 'priv-potato-juicy'] },
      { label: 'SeBackup / SeRestore / SeTakeOwnership', recommend: ['priv-se-backup', 'priv-se-restore', 'priv-se-takeownership', 'cred-sam-backup'] },
      { label: 'SeDebug / SeLoadDriver / SeManageVolume / SeTcb', recommend: ['priv-se-debug', 'priv-se-loaddriver', 'priv-se-managevolume', 'priv-se-tcb'] },
      { label: 'None of those', next: 'services' },
    ],
  },
  services: {
    question: 'Any weak service configuration?',
    hint: 'Unquoted paths, writable service binaries, weak service ACLs.',
    options: [
      { label: 'Yes — services look misconfigured', recommend: ['svc-enum', 'svc-unquoted-path', 'svc-weak-acl', 'svc-weak-binary-acl', 'svc-registry-acl'] },
      { label: 'No / not sure', next: 'creds' },
    ],
  },
  creds: {
    question: 'Found stored credentials or interesting files?',
    hint: 'Config files, GPP cpassword, unattend.xml, saved creds, KeePass.',
    options: [
      { label: 'Yes — credentials / config files', recommend: ['cred-search-files', 'cred-gpp-cpassword', 'cred-unattend', 'cred-credman', 'cred-lazagne'] },
      { label: 'No', next: 'autoruns' },
    ],
  },
  autoruns: {
    question: 'AlwaysInstallElevated, or writable autoruns / tasks?',
    options: [
      { label: 'AlwaysInstallElevated = 1', recommend: ['reg-alwaysinstallelevated'] },
      { label: 'Writable scheduled task / startup', recommend: ['task-enum', 'task-modifiable-binary', 'start-folder', 'start-run-keys'] },
      { label: 'Neither', next: 'integrity' },
    ],
  },
  integrity: {
    question: 'Are you a local admin stuck at Medium integrity?',
    hint: 'Member of Administrators but UAC is filtering your token.',
    options: [
      { label: 'Yes — need a UAC bypass', recommend: ['uac-fodhelper', 'uac-silent-cleanup', 'uac-ms-settings-delegate', 'uac-token-theft'] },
      { label: 'No — standard user', next: 'kernel' },
    ],
  },
  kernel: {
    question: 'Is the host missing patches / running an old build?',
    hint: 'Compare hotfixes against known CVEs (wesng / Watson).',
    options: [
      { label: 'Yes — looks unpatched', recommend: ['kern-workflow', 'auto-wesng', 'kern-ms16-032', 'kern-printnightmare'] },
      { label: 'Patched / not sure — what else?', recommend: ['path-writable-dir', 'path-dll-search-order', 'ad-bloodhound-collect', 'auto-winpeas-search'] },
    ],
  },
};

export function TriageWizard() {
  const open = useMethodologyStore(selectWizardOpen);
  const close = useMethodologyStore((s) => s.closeWizard);
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const router = useRouter();
  const { data: tree } = useTree();

  // Navigation stack of step ids; terminal recommendations live separately.
  const [stack, setStack] = useState<string[]>(['start']);
  const [recommend, setRecommend] = useState<string[] | null>(null);

  const byId = useMemo(
    () => new Map((tree?.nodes ?? []).map((n) => [n.id, n])),
    [tree],
  );

  const reset = () => {
    setStack(['start']);
    setRecommend(null);
  };
  const handleClose = () => {
    close();
    // Reset for next open after the exit animation.
    window.setTimeout(reset, 200);
  };
  const choose = (opt: Option) => {
    if (opt.recommend) setRecommend(opt.recommend);
    else if (opt.next) setStack((s) => [...s, opt.next!]);
  };
  const back = () => {
    if (recommend) setRecommend(null);
    else if (stack.length > 1) setStack((s) => s.slice(0, -1));
  };

  const stepId = stack[stack.length - 1] ?? 'start';
  const step: Step = STEPS[stepId] ?? (STEPS.start as Step);
  const recNodes = (recommend ?? [])
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => n != null);

  const go = (id: string) => {
    handleClose();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : handleClose())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                  <Dialog.Title className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Compass className="h-4 w-4 text-accent" />
                    Triage wizard
                  </Dialog.Title>
                  <div className="flex items-center gap-1.5">
                    {(stack.length > 1 || recommend) && (
                      <button
                        type="button"
                        onClick={back}
                        aria-label="Back"
                        className="flex h-7 w-7 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Dialog.Close asChild>
                      <button
                        aria-label="Close"
                        className="flex h-7 w-7 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </header>
                <Dialog.Description className="sr-only">
                  Answer questions to be routed to the most relevant privilege-escalation techniques.
                </Dialog.Description>

                <div className="p-5">
                  {recommend ? (
                    <div>
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                        Recommended next
                      </p>
                      <ul className="space-y-1.5">
                        {recNodes.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => go(n.id)}
                              className="group flex w-full items-center gap-2.5 rounded-input border border-hairline bg-elevated/50 px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-elevated"
                            >
                              <SeverityBadge severity={n.severity} className="shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-accent">
                                {n.title}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={reset}
                        className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
                      >
                        <RotateCcw className="h-3 w-3" />
                        start over
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base font-medium leading-snug text-fg">
                        {step.question}
                      </h3>
                      {step.hint && (
                        <p className="mt-1.5 text-xs text-fg-secondary">{step.hint}</p>
                      )}
                      <div className="mt-4 space-y-2">
                        {step.options.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => choose(opt)}
                            className="group flex w-full items-center justify-between gap-3 rounded-input border border-hairline bg-elevated/50 px-3 py-2.5 text-left text-sm text-fg transition-colors hover:border-accent/50 hover:bg-elevated"
                          >
                            <span>{opt.label}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
