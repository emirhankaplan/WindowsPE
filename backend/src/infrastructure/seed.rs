//! Content seeder.
//!
//! On boot, read `content/methodology.json` + every phase file, hash the
//! canonical concatenation, and compare against `meta.content_sha256`. If
//! the hash matches → no-op. Otherwise → wipe every content table and
//! re-insert inside a single transaction.
//!
//! The wipe-and-rewrite strategy is deliberate: content is the canonical
//! source of truth, the DB is a derived index, and there is no
//! user-generated data to preserve in v1.

use std::path::Path;

use serde::Deserialize;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

use crate::error::AppError;

// ---------------------------------------------------------------------------
// JSON shapes (mirror content/schema/methodology.schema.json)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct MethodologyFile {
    methodology_version: String,
    phases: Vec<PhaseRef>,
}

#[derive(Debug, Deserialize)]
struct PhaseRef {
    id: String,
    ordinal: i64,
    file: String,
}

#[derive(Debug, Deserialize)]
struct PhaseFile {
    phase: PhaseDecl,
    nodes: Vec<NodeDecl>,
}

#[derive(Debug, Deserialize)]
struct PhaseDecl {
    id: String,
    title: String,
    summary: String,
    #[serde(default)]
    icon: Option<String>,
    #[serde(default)]
    accent_color: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NodeDecl {
    id: String,
    #[serde(default)]
    parent_id: Option<String>,
    kind: String,
    title: String,
    summary: String,
    #[serde(default)]
    description_md: String,
    severity: String,
    #[serde(default = "default_difficulty")]
    difficulty: String,
    #[serde(default)]
    mitre_attack_id: Option<String>,
    #[serde(default)]
    detection_hints: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    prerequisites: Vec<String>,
    #[serde(default)]
    related: Vec<String>,
    #[serde(default)]
    snippets: Vec<SnippetDecl>,
    #[serde(default)]
    references: Vec<RefDecl>,
}

#[derive(Debug, Deserialize)]
struct SnippetDecl {
    shell: String,
    title: String,
    code: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    requires_admin: bool,
}

#[derive(Debug, Deserialize)]
struct RefDecl {
    title: String,
    url: String,
    kind: String,
}

fn default_difficulty() -> String {
    "oscp-basic".to_owned()
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/// Disk artifacts loaded into memory, ready to be written.
struct Loaded {
    version: String,
    content_hash: String,
    phases: Vec<(PhaseRef, PhaseFile)>,
}

fn load(content_dir: &Path) -> Result<Loaded, AppError> {
    let root_path = content_dir.join("methodology.json");
    let root_bytes = std::fs::read(&root_path).map_err(|e| {
        AppError::Internal(anyhow::anyhow!(
            "reading {}: {e}",
            root_path.display()
        ))
    })?;
    let root: MethodologyFile = serde_json::from_slice(&root_bytes)?;

    let mut hasher = Sha256::new();
    hasher.update(&root_bytes);

    let mut phases = Vec::with_capacity(root.phases.len());
    for phase_ref in root.phases {
        let p = content_dir.join(&phase_ref.file);
        let bytes = std::fs::read(&p).map_err(|e| {
            AppError::Internal(anyhow::anyhow!("reading {}: {e}", p.display()))
        })?;
        hasher.update(&bytes);
        let parsed: PhaseFile = serde_json::from_slice(&bytes)?;
        if parsed.phase.id != phase_ref.id {
            return Err(AppError::Internal(anyhow::anyhow!(
                "phase id mismatch: methodology.json declares {}, file declares {}",
                phase_ref.id,
                parsed.phase.id,
            )));
        }
        phases.push((phase_ref, parsed));
    }

    Ok(Loaded {
        version: root.methodology_version,
        content_hash: hex(hasher.finalize().as_slice()),
        phases,
    })
}

fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        write!(&mut s, "{b:02x}").expect("write to String never fails");
    }
    s
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

#[tracing::instrument(skip(pool), fields(dir = %content_dir.display()))]
pub async fn run(pool: &SqlitePool, content_dir: &Path) -> Result<(), AppError> {
    let loaded = load(content_dir)?;

    let stored: Option<String> =
        sqlx::query_scalar("SELECT value FROM meta WHERE key = 'content_sha256'")
            .fetch_optional(pool)
            .await?;

    if stored.as_deref() == Some(&loaded.content_hash) {
        tracing::info!(
            version = %loaded.version,
            "content hash unchanged; skipping seed"
        );
        return Ok(());
    }

    tracing::info!(
        version = %loaded.version,
        prev = ?stored,
        next = %loaded.content_hash,
        "content hash drifted; reseeding"
    );

    let mut tx = pool.begin().await?;
    wipe(&mut tx).await?;
    write_all(&mut tx, &loaded).await?;
    tx.commit().await?;

    tracing::info!(
        phases = loaded.phases.len(),
        "seed complete",
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Wipe + write
// ---------------------------------------------------------------------------

async fn wipe(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<(), AppError> {
    // Order matters: children before parents because phase_id is RESTRICT.
    for stmt in [
        "DELETE FROM node_edges",
        "DELETE FROM node_tags",
        "DELETE FROM refs",
        "DELETE FROM snippets",
        "DELETE FROM nodes",
        "DELETE FROM tags",
        "DELETE FROM phases",
    ] {
        sqlx::query(stmt).execute(&mut **tx).await?;
    }
    Ok(())
}

async fn write_all(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    loaded: &Loaded,
) -> Result<(), AppError> {
    // ---------------- phases ----------------
    for (phase_ref, phase_file) in &loaded.phases {
        sqlx::query(
            "INSERT INTO phases (id, ordinal, title, summary, icon, accent_color)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&phase_file.phase.id)
        .bind(phase_ref.ordinal)
        .bind(&phase_file.phase.title)
        .bind(&phase_file.phase.summary)
        .bind(&phase_file.phase.icon)
        .bind(&phase_file.phase.accent_color)
        .execute(&mut **tx)
        .await?;
    }

    // ---------------- nodes ----------------
    // Pass 1: insert all nodes (parent_id may forward-reference, but in v1
    // content every parent appears before its children inside the same file,
    // so a single pass per file works).
    for (_, phase_file) in &loaded.phases {
        let mut ordinal: i64 = 0;
        for node in &phase_file.nodes {
            sqlx::query(
                "INSERT INTO nodes
                   (id, phase_id, parent_id, kind, title, summary, description_md,
                    severity, difficulty, mitre_attack_id, detection_hints, ordinal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&node.id)
            .bind(&phase_file.phase.id)
            .bind(&node.parent_id)
            .bind(&node.kind)
            .bind(&node.title)
            .bind(&node.summary)
            .bind(&node.description_md)
            .bind(&node.severity)
            .bind(&node.difficulty)
            .bind(&node.mitre_attack_id)
            .bind(&node.detection_hints)
            .bind(ordinal)
            .execute(&mut **tx)
            .await?;
            ordinal += 1;
        }
    }

    // ---------------- tags + node_tags ----------------
    use std::collections::HashSet;
    let mut all_tags: HashSet<&str> = HashSet::new();
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            for t in &node.tags {
                all_tags.insert(t.as_str());
            }
        }
    }
    for t in &all_tags {
        sqlx::query("INSERT INTO tags (id, label) VALUES (?, ?)")
            .bind(t)
            .bind(t)
            .execute(&mut **tx)
            .await?;
    }
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            for t in &node.tags {
                sqlx::query("INSERT INTO node_tags (node_id, tag_id) VALUES (?, ?)")
                    .bind(&node.id)
                    .bind(t)
                    .execute(&mut **tx)
                    .await?;
            }
        }
    }

    // ---------------- FTS tags column ----------------
    // The `nodes_ai` trigger fires on the `nodes` INSERT, before node_tags
    // exist, so it can only seed `tags = ''`. Populate the FTS `tags` column
    // directly here so tag keywords are actually searchable.
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            if node.tags.is_empty() {
                continue;
            }
            let joined = node.tags.join(" ");
            sqlx::query("UPDATE nodes_fts SET tags = ? WHERE id = ?")
                .bind(&joined)
                .bind(&node.id)
                .execute(&mut **tx)
                .await?;
        }
    }

    // ---------------- snippets ----------------
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            for (idx, s) in node.snippets.iter().enumerate() {
                sqlx::query(
                    "INSERT INTO snippets
                       (node_id, shell, title, code, description, requires_admin, ordinal)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                )
                .bind(&node.id)
                .bind(&s.shell)
                .bind(&s.title)
                .bind(&s.code)
                .bind(&s.description)
                .bind(if s.requires_admin { 1_i64 } else { 0_i64 })
                .bind(idx as i64)
                .execute(&mut **tx)
                .await?;
            }
        }
    }

    // ---------------- refs ----------------
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            for r in &node.references {
                sqlx::query(
                    "INSERT INTO refs (node_id, title, url, kind)
                     VALUES (?, ?, ?, ?)",
                )
                .bind(&node.id)
                .bind(&r.title)
                .bind(&r.url)
                .bind(&r.kind)
                .execute(&mut **tx)
                .await?;
            }
        }
    }

    // ---------------- edges ----------------
    // Tree parent → child edges
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            if let Some(parent) = &node.parent_id {
                sqlx::query(
                    "INSERT INTO node_edges (source_id, target_id, kind) VALUES (?, ?, 'child')",
                )
                .bind(parent)
                .bind(&node.id)
                .execute(&mut **tx)
                .await?;
            }
        }
    }
    // Prerequisite + related edges
    for (_, phase_file) in &loaded.phases {
        for node in &phase_file.nodes {
            for prereq in &node.prerequisites {
                sqlx::query(
                    "INSERT INTO node_edges (source_id, target_id, kind)
                     VALUES (?, ?, 'prerequisite')",
                )
                .bind(&node.id)
                .bind(prereq)
                .execute(&mut **tx)
                .await?;
            }
            for rel in &node.related {
                sqlx::query(
                    "INSERT INTO node_edges (source_id, target_id, kind)
                     VALUES (?, ?, 'related')",
                )
                .bind(&node.id)
                .bind(rel)
                .execute(&mut **tx)
                .await?;
            }
        }
    }

    // ---------------- meta ----------------
    upsert_meta(tx, "methodology_version", &loaded.version).await?;
    upsert_meta(tx, "content_sha256", &loaded.content_hash).await?;
    upsert_meta(
        tx,
        "seeded_at",
        &time::OffsetDateTime::now_utc()
            .format(&time::format_description::well_known::Rfc3339)
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?,
    )
    .await?;

    Ok(())
}

async fn upsert_meta(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    key: &str,
    value: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(value)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

