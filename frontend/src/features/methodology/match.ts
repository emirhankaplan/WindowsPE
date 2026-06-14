import type { Methodology, NodeSummary } from './types';

/**
 * High-signal token → node-id hints. These are the exact strings winPEAS /
 * `whoami /priv` / common enum tools print, so a substring match is a strong
 * signal that a specific technique applies. Ids are validated against the
 * live tree before use, so a stale id is silently ignored.
 */
const CURATED: { token: string; nodeIds: string[] }[] = [
  { token: 'seimpersonateprivilege', nodeIds: ['priv-se-impersonate', 'priv-potato-god', 'priv-potato-print'] },
  { token: 'seassignprimarytokenprivilege', nodeIds: ['priv-se-assign-primary', 'priv-se-impersonate'] },
  { token: 'sebackupprivilege', nodeIds: ['priv-se-backup', 'cred-sam-backup'] },
  { token: 'serestoreprivilege', nodeIds: ['priv-se-restore'] },
  { token: 'setakeownershipprivilege', nodeIds: ['priv-se-takeownership'] },
  { token: 'sedebugprivilege', nodeIds: ['priv-se-debug', 'cred-lsass-dump'] },
  { token: 'seloaddriverprivilege', nodeIds: ['priv-se-loaddriver'] },
  { token: 'semanagevolumeprivilege', nodeIds: ['priv-se-managevolume'] },
  { token: 'setcbprivilege', nodeIds: ['priv-se-tcb'] },
  { token: 'secreatetokenprivilege', nodeIds: ['priv-se-create-token'] },
  { token: 'alwaysinstallelevated', nodeIds: ['reg-alwaysinstallelevated'] },
  { token: 'unquoted', nodeIds: ['svc-unquoted-path'] },
  { token: 'cpassword', nodeIds: ['cred-gpp-cpassword'] },
  { token: 'unattend', nodeIds: ['cred-unattend'] },
  { token: 'defaultpassword', nodeIds: ['reg-autologon'] },
  { token: 'autologon', nodeIds: ['reg-autologon'] },
  { token: 'web.config', nodeIds: ['cred-iis-webconfig'] },
  { token: 'sysprep', nodeIds: ['cred-unattend'] },
  { token: 'kdbx', nodeIds: ['cred-keepass'] },
  { token: 'krbtgt', nodeIds: ['ad-golden-ticket', 'ad-dcsync'] },
  { token: 'spooler', nodeIds: ['kern-printnightmare', 'kern-spoolfool'] },
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'via', 'your', 'into', 'from', 'this', 'that',
  'windows', 'system', 'user', 'check', 'overview', 'detail', 'using',
]);

export interface MatchResult {
  node: NodeSummary;
  score: number;
  reasons: string[];
}

interface Indexed {
  node: NodeSummary;
  keywords: Set<string>; // general keywords (tags, title words, mitre)
}

/** Build a lightweight keyword index from the tree (memoise at the call site). */
export function buildMatchIndex(tree: Methodology): Indexed[] {
  return tree.nodes.map((node) => {
    const kw = new Set<string>();
    for (const t of node.tags) kw.add(t.toLowerCase());
    if (node.mitre_attack_id) kw.add(node.mitre_attack_id.toLowerCase());
    for (const w of node.title.toLowerCase().split(/[^a-z0-9.]+/)) {
      if (w.length >= 4 && !STOPWORDS.has(w)) kw.add(w);
    }
    return { node, keywords: kw };
  });
}

/**
 * Score nodes against pasted tool output. Curated token hits weigh heavily;
 * general keyword hits add a point each. Returns ranked, non-zero matches.
 */
export function analyzeOutput(
  text: string,
  index: Indexed[],
  validIds: Set<string>,
  limit = 12,
): MatchResult[] {
  const hay = text.toLowerCase();
  if (hay.trim().length < 3) return [];

  const scores = new Map<string, { score: number; reasons: Set<string> }>();
  const bump = (id: string, by: number, reason: string) => {
    if (!validIds.has(id)) return;
    const cur = scores.get(id) ?? { score: 0, reasons: new Set<string>() };
    cur.score += by;
    cur.reasons.add(reason);
    scores.set(id, cur);
  };

  // Curated high-signal tokens.
  for (const { token, nodeIds } of CURATED) {
    if (hay.includes(token)) {
      for (const id of nodeIds) bump(id, 5, token);
    }
  }

  // General keyword presence (word-boundary-ish on the haystack token set).
  const words = new Set(hay.split(/[^a-z0-9.]+/).filter((w) => w.length >= 4));
  for (const { node, keywords } of index) {
    for (const kw of keywords) {
      if (words.has(kw) || (kw.includes('.') && hay.includes(kw))) {
        bump(node.id, 1, kw);
      }
    }
  }

  const byId = new Map(index.map((i) => [i.node.id, i.node]));
  const results: MatchResult[] = [];
  for (const [id, { score, reasons }] of scores) {
    const node = byId.get(id);
    if (node) results.push({ node, score, reasons: [...reasons].slice(0, 5) });
  }
  results.sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title));
  return results.slice(0, limit);
}
