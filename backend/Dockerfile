# syntax=docker/dockerfile:1.7

# ============================================================================
# WindowsPE — backend image
#
# Multi-stage build using cargo-chef so dependency compilation is cached as
# its own layer. Iterating on src/ rebuilds the binary in ~10s instead of
# recompiling every transitive dep every time.
#
# Build from the repository root:
#   docker build -f backend/Dockerfile -t windowspe-backend:latest .
# ============================================================================

# 1.85+ required: the locked dependency tree (e.g. idna_adapter 1.2.2) uses
# edition2024, which is only stable from Rust/Cargo 1.85 onwards.
ARG RUST_VERSION=1.96
ARG DEBIAN_VERSION=bookworm

# ---------------------------------------------------------------------------
# Stage 1: chef — cargo-chef installed on top of the official Rust image
# ---------------------------------------------------------------------------
FROM rust:${RUST_VERSION}-${DEBIAN_VERSION} AS chef
WORKDIR /app
RUN cargo install cargo-chef --locked --version ^0.1

# ---------------------------------------------------------------------------
# Stage 2: planner — analyse the workspace, produce a deterministic recipe.json
# ---------------------------------------------------------------------------
FROM chef AS planner
COPY backend/ ./
RUN cargo chef prepare --recipe-path recipe.json

# ---------------------------------------------------------------------------
# Stage 3: builder — cook deps from the recipe, then build the binary
# ---------------------------------------------------------------------------
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# This is the slow step — every Cargo dep is built here. The output is
# cached as long as Cargo.toml / Cargo.lock don't change.
RUN cargo chef cook --release --recipe-path recipe.json
# Now copy real sources and build the binary against the warm cache.
COPY backend/ ./
RUN cargo build --release --bin windowspe-backend \
 && strip target/release/windowspe-backend

# ---------------------------------------------------------------------------
# Stage 4: runtime — debian-slim with only what the binary needs
# ---------------------------------------------------------------------------
FROM debian:${DEBIAN_VERSION}-slim AS runtime

# ca-certificates → outbound TLS if ever needed; curl → healthcheck
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1000 windowspe \
 && useradd  --system --uid 1000 --gid windowspe --home /srv/windowspe windowspe

WORKDIR /srv/windowspe

# Copy the binary and the content tree the seeder reads at boot. Migrations
# are baked into the binary by `sqlx::migrate!` at compile time, so they
# don't need to live on disk in the runtime image.
COPY --from=builder /app/target/release/windowspe-backend /usr/local/bin/windowspe-backend
COPY content ./content

ENV WINDOWSPE_BIND_ADDR=0.0.0.0:8080 \
    WINDOWSPE_DATABASE_URL=sqlite:///data/windowspe.db?mode=rwc \
    WINDOWSPE_CONTENT_DIR=/srv/windowspe/content \
    WINDOWSPE_LOG_LEVEL=info \
    RUST_BACKTRACE=1

# /data holds the SQLite file across container restarts via a volume mount.
RUN mkdir -p /data \
 && chown -R windowspe:windowspe /data /srv/windowspe

USER windowspe
EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/api/v1/health || exit 1

CMD ["windowspe-backend"]
