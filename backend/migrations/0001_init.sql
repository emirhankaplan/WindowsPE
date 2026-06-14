-- ============================================================
-- WindowsPE — initial schema (v1)
-- SQLite 3.38+ (STRICT tables, FTS5, foreign keys)
-- ============================================================

-- Note: `foreign_keys` and `journal_mode = WAL` are connection-level
-- pragmas, set in `infrastructure/sqlite/mod.rs` on the pool options.
-- SQLite refuses `PRAGMA journal_mode = WAL` inside a transaction, and
-- SQLx wraps each migration in one — so they can't live here.

-- ------------------------------------------------------------
-- phases: top-level methodology stages
-- ------------------------------------------------------------
CREATE TABLE phases (
    id           TEXT PRIMARY KEY,
    ordinal      INTEGER NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    summary      TEXT NOT NULL,
    icon         TEXT,
    accent_color TEXT
) STRICT;

-- ------------------------------------------------------------
-- nodes: every methodology entry (category / technique / tool)
-- ------------------------------------------------------------
CREATE TABLE nodes (
    id              TEXT PRIMARY KEY,
    phase_id        TEXT NOT NULL REFERENCES phases(id) ON DELETE RESTRICT,
    parent_id       TEXT REFERENCES nodes(id) ON DELETE SET NULL,
    kind            TEXT NOT NULL CHECK (kind IN ('phase','category','technique','tool')),
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    description_md  TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
    difficulty      TEXT NOT NULL DEFAULT 'oscp-basic'
                    CHECK (difficulty IN ('oscp-basic','oscp-advanced','red-team')),
    mitre_attack_id TEXT,
    detection_hints TEXT,
    ordinal         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
CREATE INDEX idx_nodes_phase  ON nodes(phase_id);
CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_kind   ON nodes(kind);

-- ------------------------------------------------------------
-- node_edges: DAG edges (child / prerequisite / related)
-- ------------------------------------------------------------
CREATE TABLE node_edges (
    source_id  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('child','prerequisite','related')),
    PRIMARY KEY (source_id, target_id, kind)
) STRICT;
CREATE INDEX idx_edges_target ON node_edges(target_id);

-- ------------------------------------------------------------
-- snippets: copy-to-clipboard command blocks attached to nodes
-- ------------------------------------------------------------
CREATE TABLE snippets (
    id              INTEGER PRIMARY KEY,
    node_id         TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    shell           TEXT NOT NULL CHECK (shell IN ('powershell','cmd','bash','c','text')),
    title           TEXT NOT NULL,
    code            TEXT NOT NULL,
    description     TEXT,
    requires_admin  INTEGER NOT NULL DEFAULT 0 CHECK (requires_admin IN (0,1)),
    ordinal         INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX idx_snippets_node ON snippets(node_id);

-- ------------------------------------------------------------
-- refs: external references (MITRE, HackTricks, MSDoc, CVE, …)
-- ------------------------------------------------------------
CREATE TABLE refs (
    id      INTEGER PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    title   TEXT NOT NULL,
    url     TEXT NOT NULL,
    kind    TEXT NOT NULL CHECK (kind IN ('mitre','hacktricks','msdoc','cve','blog','tool','paper'))
) STRICT;
CREATE INDEX idx_refs_node ON refs(node_id);

-- ------------------------------------------------------------
-- tags + node_tags: many-to-many tagging
-- ------------------------------------------------------------
CREATE TABLE tags (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
) STRICT;

CREATE TABLE node_tags (
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, tag_id)
) STRICT;

-- ------------------------------------------------------------
-- meta: methodology version, content hash, seed timestamp
-- ------------------------------------------------------------
CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
) STRICT;

-- ------------------------------------------------------------
-- Full-text search (FTS5)
-- ------------------------------------------------------------
CREATE VIRTUAL TABLE nodes_fts USING fts5(
    id UNINDEXED,
    title,
    summary,
    description_md,
    tags,
    tokenize = 'porter unicode61'
);

CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(id, title, summary, description_md, tags)
    VALUES (new.id, new.title, new.summary, new.description_md, '');
END;

CREATE TRIGGER nodes_au AFTER UPDATE ON nodes BEGIN
    UPDATE nodes_fts
       SET title = new.title,
           summary = new.summary,
           description_md = new.description_md
     WHERE id = new.id;
END;

CREATE TRIGGER nodes_ad AFTER DELETE ON nodes BEGIN
    DELETE FROM nodes_fts WHERE id = old.id;
END;
