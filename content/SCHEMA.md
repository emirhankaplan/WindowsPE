# Content Authoring Guide

This guide explains how to add or edit Windows Privilege Escalation content for WindowsPE.

## Layout

```
content/
├── methodology.json              # master index — registers each phase
├── schema/
│   └── methodology.schema.json   # JSON Schema (Draft 2020-12)
└── phases/
    ├── 01-initial-enumeration.json
    ├── 02-user-enumeration.json
    └── ...
```

One file per phase. CI runs `ajv validate` over every phase file plus a cross-reference linter (no orphan `parent_id`, no duplicate slugs, every `prerequisites[]` resolves).

## Slug rules

- Lowercase ASCII, hyphen-separated. Regex: `^[a-z][a-z0-9-]*$`.
- Phase-prefixed for greppability: `enum-`, `user-`, `priv-`, `auto-`, `svc-`, `reg-`, `cred-`, `task-`, `start-`, `path-`, `uac-`, `kern-`, `bypass-`, `ad-`.
- Slugs are **stable identifiers** — never rename a published slug; user `localStorage` progress keys on it.

## Severity rubric

| Value      | Meaning |
|------------|---------|
| `info`     | Enumeration / context only, no direct exploitation |
| `low`      | Information disclosure, weak primitive |
| `medium`   | Useful primitive, often requires chaining |
| `high`     | Reliable local privesc to admin / service account |
| `critical` | Reliable SYSTEM / kernel / domain compromise |

## Difficulty rubric

| Value           | Meaning |
|-----------------|---------|
| `oscp-basic`    | Standard PWK / OSCP-exam-grade technique |
| `oscp-advanced` | Real-world boxes, less common, more nuance |
| `red-team`      | Operational red-team / EDR-aware tradecraft |

## Node kinds

| Kind       | When to use |
|------------|-------------|
| `phase`    | Root phase wrapper (auto-generated from the `phase` block — usually do not author manually) |
| `category` | Grouping node, no exploitation steps of its own (e.g. "Service Enumeration") |
| `technique`| A specific exploit/abuse step with at least one snippet |
| `tool`     | A named tool (WinPEAS, PowerUp, accesschk) treated as its own node |

## Snippet style

- Use the smallest **complete** command that demonstrates the step.
- Multi-line is fine; preserve real newlines in the JSON string (`\n`).
- Prefer canonical syntax: PowerShell cmdlets over aliases when the cmdlet is clearer, but `dir` / `ls` shortcuts are fine when idiomatic.
- Mark `requires_admin: true` only when the snippet itself needs an already-elevated context (e.g. dumping LSASS).
- Avoid host-specific values (IPs, paths). Use clearly fake placeholders: `10.10.14.5`, `4444`, `C:\Temp\`, `payload.exe`.

## Adding a new phase

1. Pick a phase slug + ordinal (append to the end of `phases[]` in `methodology.json`).
2. Pick a phase prefix (e.g. `lateral-` for lateral-movement nodes) and document it here.
3. Create `content/phases/NN-<slug>.json` mirroring an existing phase file.
4. Run `ajv validate -s content/schema/methodology.schema.json -d 'content/phases/*.json'`.
5. Run the cross-reference linter (`backend/xtask lint-content`).

## Detection hints

Every `technique` node should include a short `detection_hints` field. The audience is mixed — defenders use this too. Examples:

- "Sysmon 1 (process create) with parent `services.exe` and an unexpected image path."
- "Event ID 4697 (service install) under a non-admin user."

## References

Prefer authoritative sources in this order: **MITRE ATT&CK → Microsoft docs → HackTricks → original blog post**. Always include the MITRE ID when applicable.
