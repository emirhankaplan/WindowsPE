# WindowsPE — Environment Variables

## Do I need any secrets?

**No.** WindowsPE is a SQLite + read-only API; nothing requires a secret key.
Every variable below has a safe default baked into the code — running with an
empty or missing value will **not** crash the app.

---

## Backend — `backend/.env` (gitignored)

| Variable | Required | Default | Description |
|---|---|---|---|
| `WINDOWSPE_BIND_ADDR` | no | `127.0.0.1:8080` | Listening socket (inside the process / container) |
| `WINDOWSPE_DATABASE_URL` | no | `sqlite://./windowspe.db?mode=rwc` | SQLx connection URL; the file is created on first boot |
| `WINDOWSPE_CONTENT_DIR` | no | `../content` | Path to the methodology JSON tree |
| `WINDOWSPE_LOG_LEVEL` | no | `info` | `tracing-subscriber` env-filter directive |
| `WINDOWSPE_CACHE_TTL_SECS` | no | `300` | In-memory cache TTL for the methodology payload |
| `WINDOWSPE_CORS_ORIGINS` | **yes in prod** | `http://localhost:3000` | Comma-separated frontend origin allowlist |

> **CORS is fail-closed.** If `WINDOWSPE_CORS_ORIGINS` is empty or wrong,
> the router rejects **every** cross-origin request — there is no
> `AllowOrigin::any()` fallback. In production set it to the full origin
> (e.g. `https://windowspe.example.com`).

---

## Frontend — `frontend/.env.local` (gitignored)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | **yes in prod** | `http://localhost:8080/api/v1` | Backend API base URL (inlined into the client bundle at build time) |

---

## Setup

```bash
# Backend
cp backend/.env.example backend/.env
$EDITOR backend/.env                # tweak values if you like
cd backend && cargo build

# Frontend
cp frontend/.env.example frontend/.env.local
$EDITOR frontend/.env.local         # set NEXT_PUBLIC_API_BASE_URL for prod
cd frontend && npm install && npm run build
```

## .gitignore status

- `backend/.env` — ignored by the repo-root `.gitignore`.
- `frontend/.env`, `frontend/.env.local` — ignored by the repo-root `.gitignore`.
- `.env.example` files — **tracked** on purpose (they document the variables).
