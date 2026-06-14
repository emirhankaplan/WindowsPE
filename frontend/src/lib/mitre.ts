/**
 * Build a canonical MITRE ATT&CK technique URL from an attack id.
 *
 * Handles plain techniques (`T1134`) and sub-techniques (`T1134.001`),
 * mapping the dot form to ATT&CK's `/techniques/T1134/001/` path layout.
 * Returns null for anything that isn't a well-formed `Tnnnn[.nnn]` id so
 * callers can fall back to plain text.
 */
export function mitreUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  const m = /^T(\d{4})(?:\.(\d{3}))?$/i.exec(id.trim());
  if (!m) return null;
  const base = `T${m[1]}`;
  return m[2]
    ? `https://attack.mitre.org/techniques/${base}/${m[2]}/`
    : `https://attack.mitre.org/techniques/${base}/`;
}
