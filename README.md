<div align="center">

# WindowsPE

**An interactive Windows Privilege Escalation methodology — built to be the tool you reach for during a CTF or pentest, not just a reference you read.**

[![techniques](https://img.shields.io/badge/techniques-226-5BE5C0?style=flat-square&labelColor=0A0B0F)](#content)
[![phases](https://img.shields.io/badge/phases-14-A78BFA?style=flat-square&labelColor=0A0B0F)](#content)
[![offline](https://img.shields.io/badge/offline-PWA-FF8A3D?style=flat-square&labelColor=0A0B0F)](#installable--offline-pwa)
[![rust](https://img.shields.io/badge/backend-Rust%20%2B%20Axum-FF3B5C?style=flat-square&labelColor=0A0B0F)](#tech-stack)
[![next](https://img.shields.io/badge/frontend-Next.js%2015-5B9AC4?style=flat-square&labelColor=0A0B0F)](#tech-stack)
[![license: MIT](https://img.shields.io/badge/license-MIT-FFD84D?style=flat-square&labelColor=0A0B0F)](LICENSE)

</div>

---

A premium dark-mode web app that maps the full Windows local-privesc methodology to an interactive graph of **226 techniques across 14 phases**. Click any node to open ready-to-execute PowerShell / CMD / Bash snippets — **with your LHOST / LPORT / target auto-substituted**, MITRE ATT&CK mappings, detection hints, and curated references. Paste `whoami /priv` or winPEAS output and the **output analyzer** ranks the applicable techniques for you. Step through the **guided triage wizard** when you're stuck. Track progress, take per-node notes, build kill-chain **playbooks**, drill **flashcards** in study mode, and export everything as Markdown. Works **fully offline as an installable PWA** once visited — designed for the OSCP exam, CTFs, and real engagements.

> WindowsPE is *opinionated*: passive reference sites already exist. This one's a co-pilot.

---

## Table of contents

- [Features](#features)
  - [The graph](#the-graph)
  - [Co-pilot tools](#co-pilot-tools)
  - [Content](#content)
  - [Quality of life](#quality-of-life)
- [Screenshots & demo](#screenshots--demo)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quickstart — local development](#quickstart--local-development)
- [Content authoring](#content-authoring)
- [Production deployment](#production-deployment)
- [Configuration](#configuration)
- [API surface](#api-surface)
- [What's shipped (v1)](#whats-shipped-v1)
- [Roadmap](#roadmap)
- [Ethics & legal](#ethics--legal)
- [License](#license)

---

## Features

### The graph

- **Full methodology as an interactive React Flow canvas** — 226 technique cards + 14 phase anchors auto-laid-out with dagre; pan, zoom, click any node to slide-in its detail panel.
- **Severity-coloured everything** — cards, side stripes, minimap dots, and detail-panel chips map to the same `info → low → medium → high → critical` ramp so danger reads at a glance.
- **Relationship overlay (toggle)** — show `prerequisite` (violet arrows) and `related` (cyan dashed) edges that are hidden by default, without ever re-running layout.
- **Focus mode** — selecting a technique dims everything except its lineage (ancestors → self → direct children + phase anchor), so the attack path pops on a 100-node canvas.
- **Filters with a shareable URL** — by severity, difficulty, or tag; non-matching nodes fade back. Active filters serialise to `?sev=…&diff=…&tag=…` so you can hand a teammate a link to your exact view.
- **Phase legend** — collapsible bottom-left panel, one row per phase with a live progress bar; click a phase to fly-zoom the canvas to fit its nodes.

### Co-pilot tools

> The four flagship features that turn this from a wiki into a tool.

- **🎯 Target context — interactive snippet variables.** Set `LHOST`, `LPORT`, target IP, domain, work dir, payload name **once** in the top bar; **every** snippet (and `Copy all`, and the Markdown export) is rewritten with your values. No more hand-editing `10.10.14.5` in 30 places. Persists to localStorage.
- **🔎 Output analyzer.** Paste real tool output — `whoami /priv`, winPEAS, accesschk — and the analyzer ranks the applicable techniques using a curated token table (`SeImpersonatePrivilege` → Potato family, `AlwaysInstallElevated` → the MSI shortcut, `cpassword` → GPP creds, …) plus a derived keyword index. Click any hit → straight to that node's detail. Press `A` to open.
- **🧭 Triage wizard.** Stuck? Walk a decision tree: *"Did you enumerate? · whoami /priv shows what? · Services weak? · Stored creds? · Need a UAC bypass? · Maybe a kernel exploit?"* — each leaf hands you the right techniques to try. Press `W` to open.
- **🎓 Study mode + ⚔️ Playbook builder.** Drill techniques as flashcards / quiz before the exam, then assemble the boxes you've owned into a kill-chain playbook you can export.

Plus the classic **⌘K / Ctrl-K command palette** — server-side FTS5 with `<mark>`-highlighted excerpts, **prefix matching** (`juic` finds JuicyPotato), **tag-aware** indexing, recently-viewed shortcuts, and quick-action items (toggle filters, export, reset progress, open analyzer / wizard / study / playbook).

### Content

- **226 nodes across 14 phases:** Initial Enumeration · User Enumeration · Token Privileges · Automated Tools · Service Misconfigurations · Registry · Stored Credentials · Scheduled Tasks · Startup Apps · PATH/DLL Hijacking · UAC / Token Impersonation · Kernel Exploits · Defense Bypass · AD Bridge.
- **Verified, real-world techniques only** — JuicyPotato / RoguePotato / GodPotato / SpoolFool / SeBackup → SAM dump / AlwaysInstallElevated / unquoted-path / SilentCleanup / fodhelper / PrintNightmare / HiveNightmare / Kerberoasting / DCSync / Golden & Silver tickets / ADCS ESC1+ESC8 / RBCD / Pass-the-Hash / etc.
- **MITRE ATT&CK mapped** — every applicable technique tagged with its `T-id`, rendered as a clickable link to `attack.mitre.org`.
- **Three-snippet style** — PowerShell, CMD, Bash (and C where appropriate); each command uses **realistic placeholders** (`10.10.14.5`, `4444`, `C:\Temp\`, `payload.exe`) that the target-context substitutes live.
- **Curated references per node** — HackTricks, Microsoft Docs, MITRE, CVE entries, original disclosure blogs, tool repos.
- **Detection hints** where appropriate — what defenders see when this technique is run.
- **Cross-links** — `prerequisites` and `related` resolve to the actual node ids; both feed the relationship overlay and the side-panel chips.

### Quality of life

- **🗒️ Per-node notes** — a private scratchpad in every panel; debounced auto-save to localStorage; flows into the Markdown export.
- **📋 Progress tracker** — mark techniques `done` / `skipped`; counts in the top bar; ratio bar; export to Markdown.
- **📥 Markdown export** — your progress checklist + notes, grouped by phase, ready for your OSCP report or Obsidian vault.
- **🎹 Full keyboard control** — `⌘K`/`/` search, `A` analyzer, `W` wizard, `S` study, `P` playbook, `F` filters, `E` export, `?` help, `Esc` close.
- **🕒 Recently viewed** — the palette remembers your last 8 nodes for one-tap return.
- **📲 Installable + offline PWA** — manifest + service worker; once visited, the app shell + API responses are cached so it works on the plane, in the exam VM, or on a flaky hotel Wi-Fi.
- **♿️ Accessible** — keyboard-navigable canvas (Enter/Space on focused nodes), focus-visible accent rings, `prefers-reduced-motion` respected (calm UI for sensitive users), ARIA on every interactive control.
- **⚡️ Fast** — Geist + JetBrains Mono **self-hosted** (zero CDN runtime), HTTP `ETag` + `Cache-Control` honoured, dagre layout memoised so toggles never re-layout.
- **🎨 Premium dark mode** — Tailwind v4 CSS-first theme tokens, hairline borders, electric cyan/violet accents, subtle film-grain canvas, optional grid overlay.

---

## Screenshots & demo

> Screenshots and a live demo URL land here. Recommended shots: full canvas,
> detail panel with snippets, output analyzer, triage wizard, ⌘K palette.
> Drop them in `docs/img/` and link them in this section.

**Live demo:** _coming soon — add your Vercel URL here once deployed._

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl-K` | Open command palette (search + quick actions) |
| `/` | Open command palette |
| `A` | Open output analyzer |
| `W` | Open triage wizard |
| `S` | Open study mode |
| `P` | Open playbook builder |
| `F` | Toggle canvas filters |
| `E` | Export checklist + notes as Markdown |
| `?` | Show keyboard shortcuts |
| `Esc` | Close active panel / dialog |
| `Enter` / `Space` | Open focused node on the canvas |

Press `?` inside the app to see this list in-context.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15 frontend  (Vercel · installable PWA)            │
│                                                             │
│   ┌───────────┐   ┌──────────────┐   ┌─────────────────┐    │
│   │  React    │ → │  TanStack    │ → │  api-client.ts  │    │
│   │  Flow     │   │  Query       │   │  (typed fetch)  │    │
│   └─────┬─────┘   └──────┬───────┘   └────────┬────────┘    │
│         │     ┌──────────┴──────┐             │             │
│         └─────┤  Zustand store  ├─────────────┘             │
│               │  selection +    │                           │
│               │  progress +     │                           │
│               │  notes + vars + │                           │
│               │  playbook       │                           │
│               └────────┬────────┘                           │
│                        │                                    │
│                ┌───────┴────────┐                           │
│                │ service worker │  cache shell + API        │
│                │   (sw.js)      │  → fully offline          │
│                └────────────────┘                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       GET /api/v1/*  (JSON envelope)
                               │
┌──────────────────────────────┴──────────────────────────────┐
│  Rust / Axum backend  (Docker on VPS)                       │
│                                                             │
│  ┌─────────────┐   ┌─────────────────┐   ┌──────────────┐   │
│  │ interfaces/ │ ← │  application/   │ → │infrastructure│   │
│  │  handlers/  │   │  use cases +    │   │ SQLite repo  │   │
│  │  router.rs  │   │ NodeRepository  │   │ + FTS5 search│   │
│  └──────┬──────┘   │     trait       │   └──────┬───────┘   │
│         │          └─────────────────┘          │           │
│         ↓                  ↑                    ↓           │
│   DTO envelope       domain entities         SQLite + FTS5  │
│  { data, error }    (Phase, Node, …)         (single file)  │
│                                                             │
│             ↑ seeded at boot from content/ ↑                │
└─────────────────────────────────────────────────────────────┘
                               ↑
                     git-versioned JSON
                    (content/phases/*.json)
```

**Pragmatic layered architecture** — `domain → application → infrastructure → interfaces`. The domain is framework-free. Persistence sits behind a `NodeRepository` trait so swapping SQLite → Postgres later is a single new file. Content is git-versioned JSON; the DB is a derived index, seeded on boot via a sha256-gated, idempotent reseeder.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Rust 1.78+, Axum 0.7, SQLx 0.8, Tokio, tracing, Moka cache |
| Database | SQLite 3.38+ with FTS5 (zero-ops; behind a `NodeRepository` trait) |
| Frontend | Next.js 15 (App Router), React 19, TanStack Query 5, Zustand 5 |
| Graph viz | React Flow (`@xyflow/react`) v12, auto-layout via dagre |
| Styling | Tailwind CSS v4 (CSS-first `@theme`), shadcn-style primitives over Radix UI |
| Code rendering | Shiki (VS Code grammar) |
| Search palette | `cmdk` + backend FTS5 (prefix + tag-indexed) |
| Animation | Framer Motion |
| PWA | Hand-rolled service worker + Web App Manifest (no `next-pwa`) |
| Fonts | Self-hosted Geist + JetBrains Mono via `next/font` |
| Content | Git-versioned JSON validated by JSON Schema (Draft 2020-12) |
| Hosting | Frontend on Vercel; backend Docker container on any VPS |

---

## Repository layout

```
WindowsPE/
├── backend/                Rust + Axum API
│   ├── src/
│   │   ├── domain/         pure entities — no I/O, no framework deps
│   │   ├── application/    use cases + NodeRepository trait
│   │   ├── infrastructure/ SQLite repo + content seeder
│   │   └── interfaces/     handlers, router, DTOs
│   ├── migrations/         SQLx migrations (FTS5 setup)
│   ├── Cargo.toml
│   └── Dockerfile
│
├── frontend/               Next.js 15 (App Router · PWA)
│   ├── public/             icons, manifest, sw.js
│   └── src/
│       ├── app/            root layout, /, /node/[id], manifest.ts
│       ├── components/
│       │   ├── tree/       MethodologyCanvas, PhaseNode, TechniqueNode,
│       │   │               FilterBar, PhaseLegend
│       │   ├── panel/      NodeDetailPanel, SnippetBlock, NoteEditor…
│       │   ├── layout/     TopBar, CommandPalette, TargetContext,
│       │   │               OutputAnalyzer, TriageWizard, StudyMode,
│       │   │               PlaybookBuilder, ShortcutsHelp,
│       │   │               ServiceWorkerRegister, ToolButtons…
│       │   └── ui/         Sheet (Radix + Framer)
│       ├── features/
│       │   ├── methodology/   hooks, store, types, match, export
│       │   └── snippets/      Shiki singleton, clipboard, substitute
│       └── lib/            api-client, layout-engine, mitre, utils
│
├── content/                Methodology content (source of truth)
│   ├── methodology.json    master index (14 phases)
│   ├── phases/*.json       14 phase files, 226 nodes total
│   ├── schema/             JSON Schema (Draft 2020-12)
│   └── SCHEMA.md           contributor guide
│
├── docker-compose.yml      backend deployment
├── ENVIRONMENT.md          env-var reference
├── LICENSE                 MIT
└── README.md
```

---

## Quickstart — local development

### Backend

Prerequisites: **Rust 1.78+** (`rustup` recommended).

```bash
cd backend
cp .env.example .env
cargo run
```

First boot:

1. Creates `windowspe.db` next to the binary.
2. Applies migrations (`0001_init.sql`, `0002_seed_meta.sql`).
3. Reads `../content/` and seeds the database in a single transaction (idempotent — re-running with unchanged content is a no-op).
4. Listens on `127.0.0.1:8080`.

Sanity check:

```bash
curl -s http://localhost:8080/api/v1/health | jq
# → { "data": { "status": "ok", "methodology_version": "1.1.0" }, "error": null }
```

### Frontend

Prerequisites: **Node 20.11+**.

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Visit **http://localhost:3000**. The frontend talks to the backend via `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080/api/v1`).

> The service worker / PWA install only activate in **production** builds (`npm run build && npm start`). Dev mode skips them on purpose to keep HMR clean.

---

## Content authoring

Methodology content lives in **`content/phases/*.json`** and is the canonical source of truth — the DB is a derived index, seeded on backend boot (idempotent via sha256 hash gate).

See **[`content/SCHEMA.md`](content/SCHEMA.md)** for slug conventions, severity / difficulty rubrics, snippet style, and how to add a new phase. JSON Schema validation lives in `content/schema/methodology.schema.json`.

To add a technique to an existing phase: open the phase file, append a node, restart the backend — the seeder picks it up automatically. To validate before booting:

```bash
python3 -c "
import json, glob
from jsonschema import Draft202012Validator
schema = json.load(open('content/schema/methodology.schema.json'))
v = Draft202012Validator(schema)
for f in sorted(glob.glob('content/phases/*.json')):
    errs = list(v.iter_errors(json.load(open(f))))
    print(f, 'OK' if not errs else errs[0].message)
"
```

---

## Production deployment

### Backend → Docker on a VPS

The repo ships a multi-stage `backend/Dockerfile` (cargo-chef for dep caching, `debian-slim` runtime, non-root user, baked-in content, healthcheck) and a `docker-compose.yml` that wires it up with a named volume for the SQLite file.

```bash
# On the VPS
git clone <your-repo>
cd WindowsPE

# Edit the CORS allowlist to include your Vercel URL
$EDITOR docker-compose.yml      # WINDOWSPE_CORS_ORIGINS

docker compose up -d --build
docker compose logs -f backend
```

The compose file publishes the backend on **host port `127.0.0.1:8084`** (container still listens on 8080 internally — adjust to taste). SQLite data persists to the named volume `windowspe_data`. Healthcheck hits `/api/v1/health` every 30s.

Put a TLS-terminating reverse proxy in front. Example **Caddyfile**:

```
api.example.com {
    reverse_proxy localhost:8084
}
```

(Caddy auto-provisions Let's Encrypt certs.)

### Frontend → Vercel

1. Push this repo to GitHub.
2. Import into Vercel → **Root Directory: `frontend`**.
3. Add env var: `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1`.
4. Update `WINDOWSPE_CORS_ORIGINS` on the backend to include your `https://*.vercel.app` URL.

Next.js's auto-detect handles everything else (build command, output dir, framework preset).

---

## Configuration

All backend configuration is environment-driven (`WINDOWSPE_*` prefix). See **[`ENVIRONMENT.md`](ENVIRONMENT.md)** and **`backend/.env.example`** for the full reference. Headline knobs:

| Variable | Default | Description |
|----------|---------|-------------|
| `WINDOWSPE_BIND_ADDR` | `127.0.0.1:8080` | Listening socket inside the process |
| `WINDOWSPE_DATABASE_URL` | `sqlite://./windowspe.db?mode=rwc` | SQLx connection URL |
| `WINDOWSPE_CONTENT_DIR` | `../content` | Path to content tree |
| `WINDOWSPE_CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origin allowlist (fail-closed) |
| `WINDOWSPE_CACHE_TTL_SECS` | `300` | Methodology in-memory cache TTL |
| `WINDOWSPE_LOG_LEVEL` | `info` | `tracing-subscriber` env-filter directive |

> **CORS is fail-closed.** Empty / wrong `WINDOWSPE_CORS_ORIGINS` → all cross-origin requests rejected (no `AllowOrigin::any()`).

Frontend has exactly one env var: `NEXT_PUBLIC_API_BASE_URL`.

---

## API surface

All endpoints under `/api/v1`. Uniform `{ data, error }` envelope.

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/health` | `{ status, methodology_version }` |
| `GET` | `/methodology` | Full graph (phases + node summaries + edges). ETag-cached. |
| `GET` | `/nodes/:id` | Single node detail with snippets, references, prerequisites, related |
| `GET` | `/search?q=&limit=` | FTS5 hits (prefix + tag-indexed) with `<mark>`-highlighted excerpts |

The Rust DTOs in `backend/src/interfaces/dto/` are mirrored 1:1 by `frontend/src/features/methodology/types.ts` — the single source of truth for the API contract on the frontend.

---

## What's shipped (v1)

- **226 techniques × 14 phases**, ~400 snippets, ~300 references, MITRE ATT&CK mapped where applicable
- Interactive React Flow canvas with dagre auto-layout, severity-coloured minimap, phase legend with progress + fit-view
- Filters (severity / difficulty / tag) **synced to the URL** so views are shareable
- Relationship overlay (prerequisite + related) toggleable, drawn after layout
- Focus mode dimming non-lineage nodes when one is selected
- Sliding side panel: phase breadcrumb, prev / next within phase, severity stripe, difficulty + tags, Description (Markdown + GFM), Commands, Detection, References, Cross-links, **Notes**, Progress controls
- ⌘K command palette over FTS5 (prefix + tag indexing), recently viewed, quick actions
- **Target context** — LHOST/LPORT/target/domain/work-dir/payload substituted into every snippet & export
- **Output analyzer** — paste tool output, get ranked applicable techniques with match reasons
- **Triage wizard** — guided decision tree routing you to the right node
- **Study mode** — flashcard / quiz drilling
- **Playbook builder** — assemble a kill-chain across techniques and export
- Per-node Notes (localStorage, fed into export)
- Markdown export of the full checklist + notes
- Deep-linkable `/node/[id]` URLs
- Self-hosted Geist + JetBrains Mono via `next/font` (zero CDN runtime)
- HTTP `ETag` / `Cache-Control` honoured by the API client
- Reduced-motion respected
- Installable PWA + hand-rolled service worker (offline shell + API responses)
- Keyboard-accessible canvas, focus-visible accent rings, ARIA throughout
- Mobile single-column layout + collapsible top bar tools

---

## Roadmap

Shipped — see above. Open:

- Auth + cloud sync of progress / notes / playbooks (multi-device study)
- OpenAPI schema generation via `utoipa` + auto-generated TS client
- Sibling-walk via keyboard arrows directly on the canvas
- Atomic Red Team / Sigma rule cross-references in detection hints
- Reverse-shell / payload generator (revshells.com-style, fed from the target context)
- Deeper Active Directory module (cert services chains, AD CS ESC1-ESC11, BloodHound integration ideas)

PRs welcome.

---

## Ethics & legal

This content is for **authorised security testing, CTF practice, and education only**. Every technique here is publicly documented (HackTricks, MITRE ATT&CK, Microsoft docs, original disclosure blogs and CVEs). Use against systems you don't own or aren't explicitly authorised to test is illegal and unethical.

The maintainers accept no liability for misuse.

---

## License

[MIT](LICENSE) © WindowsPE contributors.

---

<div align="center">

Built with **Rust** · **Axum** · **SQLx** · **SQLite + FTS5** · **Next.js 15** · **React 19** · **React Flow** · **Shiki** · **Tailwind v4** · **Radix UI** · **Framer Motion** · **cmdk**

</div>
