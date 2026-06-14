import type { TargetVars } from '@/features/methodology/store';
import { DEFAULT_VARS } from '@/features/methodology/store';

/**
 * Map each canonical placeholder string used in the content to the target-var
 * key that overrides it. Ordered longest-first so a longer token (e.g.
 * `10.10.10.10`) is matched before any shorter substring could interfere.
 */
const SUBSTITUTIONS: { placeholder: string; key: keyof TargetVars }[] = [
  { placeholder: DEFAULT_VARS.targetIp, key: 'targetIp' }, // 10.10.10.10
  { placeholder: DEFAULT_VARS.lhost, key: 'lhost' },       // 10.10.14.5
  { placeholder: 'VICTIM-IP', key: 'targetIp' },
  { placeholder: DEFAULT_VARS.domain, key: 'domain' },     // corp.local
  { placeholder: DEFAULT_VARS.payload, key: 'payload' },   // payload.exe
  { placeholder: DEFAULT_VARS.workdir, key: 'workdir' },   // C:\Temp
  { placeholder: DEFAULT_VARS.lport, key: 'lport' },       // 4444
];
// Longest placeholder first so a longer token is matched before any shorter
// substring could interfere.
SUBSTITUTIONS.sort((a, b) => b.placeholder.length - a.placeholder.length);

/** Replace every occurrence of `find` with `repl` (no regex, literal). */
function replaceAll(haystack: string, find: string, repl: string): string {
  if (!find || find === repl) return haystack;
  return haystack.split(find).join(repl);
}

/**
 * Substitute the user's target context into a snippet. Returns the code
 * unchanged when every var is still at its default, so untouched snippets are
 * byte-identical to the authored content.
 */
export function applyVars(code: string, vars: TargetVars): string {
  let out = code;
  for (const { placeholder, key } of SUBSTITUTIONS) {
    out = replaceAll(out, placeholder, vars[key]);
  }
  return out;
}

/** True if the user has customised any variable away from its default. */
export function hasCustomVars(vars: TargetVars): boolean {
  return (Object.keys(DEFAULT_VARS) as (keyof TargetVars)[]).some(
    (k) => vars[k] !== DEFAULT_VARS[k],
  );
}
