//! SQLite implementation of `NodeRepository`.
//!
//! All SQL lives here. Row structs (`*Row`) mirror table layouts; conversion
//! to domain types happens via local helpers so the domain layer stays free
//! of SQLx annotations.

use std::collections::HashMap;

use async_trait::async_trait;
use sqlx::{Row, SqlitePool};

use crate::application::repositories::{NodeRepository, SearchHit};
use crate::domain::{
    Difficulty, EdgeKind, Node, NodeEdge, NodeKind, Phase, RefKind, Reference, Severity, Shell,
    Snippet,
};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteNodeRepository {
    pool: SqlitePool,
}

impl SqliteNodeRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

// ---------------------------------------------------------------------------
// Row → Domain conversions
// ---------------------------------------------------------------------------

fn parse_severity(s: &str) -> Result<Severity, AppError> {
    Ok(match s {
        "info" => Severity::Info,
        "low" => Severity::Low,
        "medium" => Severity::Medium,
        "high" => Severity::High,
        "critical" => Severity::Critical,
        other => return Err(invalid("severity", other)),
    })
}

fn parse_difficulty(s: &str) -> Result<Difficulty, AppError> {
    Ok(match s {
        "oscp-basic" => Difficulty::OscpBasic,
        "oscp-advanced" => Difficulty::OscpAdvanced,
        "red-team" => Difficulty::RedTeam,
        other => return Err(invalid("difficulty", other)),
    })
}

fn parse_kind(s: &str) -> Result<NodeKind, AppError> {
    Ok(match s {
        "phase" => NodeKind::Phase,
        "category" => NodeKind::Category,
        "technique" => NodeKind::Technique,
        "tool" => NodeKind::Tool,
        other => return Err(invalid("node kind", other)),
    })
}

fn parse_edge_kind(s: &str) -> Result<EdgeKind, AppError> {
    Ok(match s {
        "child" => EdgeKind::Child,
        "prerequisite" => EdgeKind::Prerequisite,
        "related" => EdgeKind::Related,
        other => return Err(invalid("edge kind", other)),
    })
}

fn edge_kind_str(k: EdgeKind) -> &'static str {
    match k {
        EdgeKind::Child => "child",
        EdgeKind::Prerequisite => "prerequisite",
        EdgeKind::Related => "related",
    }
}

fn parse_shell(s: &str) -> Result<Shell, AppError> {
    Ok(match s {
        "powershell" => Shell::Powershell,
        "cmd" => Shell::Cmd,
        "bash" => Shell::Bash,
        "c" => Shell::C,
        "text" => Shell::Text,
        other => return Err(invalid("shell", other)),
    })
}

fn parse_ref_kind(s: &str) -> Result<RefKind, AppError> {
    Ok(match s {
        "mitre" => RefKind::Mitre,
        "hacktricks" => RefKind::Hacktricks,
        "msdoc" => RefKind::Msdoc,
        "cve" => RefKind::Cve,
        "blog" => RefKind::Blog,
        "tool" => RefKind::Tool,
        "paper" => RefKind::Paper,
        other => return Err(invalid("reference kind", other)),
    })
}

fn invalid(field: &str, value: &str) -> AppError {
    AppError::Internal(anyhow::anyhow!("invalid {field} in database: {value:?}"))
}

// ---------------------------------------------------------------------------
// FTS5 input sanitisation
// ---------------------------------------------------------------------------

/// Sanitize the HTML snippet returned by FTS5 `snippet()`.
///
/// FTS5 snippet() can only emit `<mark>` / `</mark>` tags as highlight markers
/// (configured in the SQL call). However the *content* inside those markers
/// comes from the database (description_md, tags, …), so we must ensure no
/// other HTML slips through if a content field ever contains markup.
///
/// Strategy: escape everything, then unescape only the `<mark>` / `</mark>`
/// pair that we ourselves injected in the SQL call.
fn sanitize_snippet(raw: &str) -> String {
    // Temporarily replace our known-safe markers before HTML-escaping.
    let tmp = raw
        .replace("<mark>", "\x00MARK_OPEN\x00")
        .replace("</mark>", "\x00MARK_CLOSE\x00");
    // Escape all remaining HTML.
    let escaped = tmp
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;");
    // Restore safe markers.
    escaped
        .replace("\x00MARK_OPEN\x00", "<mark>")
        .replace("\x00MARK_CLOSE\x00", "</mark>")
}

/// Strip FTS5 syntax characters and recombine the remaining tokens with
/// implicit AND, each token phrase-quoted. Empty input yields an empty string,
/// which the caller treats as "no results".
fn sanitize_fts(input: &str) -> String {
    let terms: Vec<String> = input
        .split_whitespace()
        .filter_map(|tok| {
            let cleaned: String = tok
                .chars()
                .filter(|c| c.is_alphanumeric() || matches!(c, '-' | '_'))
                .collect();
            if cleaned.is_empty() {
                None
            } else {
                // Trailing `*` makes each term a prefix query, so "juicy"
                // matches "JuicyPotato" and "alwaysinstall" matches
                // "AlwaysInstallElevated" — forgiving, fast lookups.
                Some(format!("\"{cleaned}\"*"))
            }
        })
        .collect();
    terms.join(" AND ")
}

// ---------------------------------------------------------------------------
// Trait impl
// ---------------------------------------------------------------------------

#[async_trait]
impl NodeRepository for SqliteNodeRepository {
    async fn ping(&self) -> Result<(), AppError> {
        sqlx::query_scalar::<_, i64>("SELECT 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(())
    }

    async fn list_phases(&self) -> Result<Vec<Phase>, AppError> {
        let rows = sqlx::query(
            "SELECT id, ordinal, title, summary, icon, accent_color
             FROM phases
             ORDER BY ordinal",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Phase {
                id: r.get::<String, _>("id"),
                ordinal: r.get::<i64, _>("ordinal") as i32,
                title: r.get::<String, _>("title"),
                summary: r.get::<String, _>("summary"),
                icon: r.get::<Option<String>, _>("icon"),
                accent_color: r.get::<Option<String>, _>("accent_color"),
            })
            .collect())
    }

    async fn list_nodes(&self) -> Result<Vec<Node>, AppError> {
        // Two queries + in-memory grouping for tags. Cheaper than a JOIN-with-GROUP_CONCAT
        // dance because SQLite doesn't have first-class arrays.
        let rows = sqlx::query(
            "SELECT id, phase_id, parent_id, kind, title, summary, description_md,
                    severity, difficulty, mitre_attack_id, detection_hints, ordinal
             FROM nodes
             ORDER BY phase_id, ordinal, id",
        )
        .fetch_all(&self.pool)
        .await?;

        let tag_rows = sqlx::query("SELECT node_id, tag_id FROM node_tags")
            .fetch_all(&self.pool)
            .await?;

        let mut tags_by_node: HashMap<String, Vec<String>> = HashMap::new();
        for r in tag_rows {
            tags_by_node
                .entry(r.get::<String, _>("node_id"))
                .or_default()
                .push(r.get::<String, _>("tag_id"));
        }

        rows.into_iter()
            .map(|r| {
                let id: String = r.get("id");
                let tags = tags_by_node.remove(&id).unwrap_or_default();
                Ok(Node {
                    id,
                    phase_id: r.get("phase_id"),
                    parent_id: r.get("parent_id"),
                    kind: parse_kind(&r.get::<String, _>("kind"))?,
                    title: r.get("title"),
                    summary: r.get("summary"),
                    description_md: r.get("description_md"),
                    severity: parse_severity(&r.get::<String, _>("severity"))?,
                    difficulty: parse_difficulty(&r.get::<String, _>("difficulty"))?,
                    mitre_attack_id: r.get("mitre_attack_id"),
                    detection_hints: r.get("detection_hints"),
                    ordinal: r.get::<i64, _>("ordinal") as i32,
                    tags,
                })
            })
            .collect()
    }

    async fn list_edges(&self) -> Result<Vec<NodeEdge>, AppError> {
        let rows = sqlx::query("SELECT source_id, target_id, kind FROM node_edges")
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter()
            .map(|r| {
                Ok(NodeEdge {
                    source_id: r.get("source_id"),
                    target_id: r.get("target_id"),
                    kind: parse_edge_kind(&r.get::<String, _>("kind"))?,
                })
            })
            .collect()
    }

    async fn get_node(&self, id: &str) -> Result<Option<Node>, AppError> {
        let row = sqlx::query(
            "SELECT id, phase_id, parent_id, kind, title, summary, description_md,
                    severity, difficulty, mitre_attack_id, detection_hints, ordinal
             FROM nodes WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(r) = row else { return Ok(None) };

        let tags: Vec<String> = sqlx::query_scalar(
            "SELECT tag_id FROM node_tags WHERE node_id = ? ORDER BY tag_id",
        )
        .bind(id)
        .fetch_all(&self.pool)
        .await?;

        Ok(Some(Node {
            id: r.get("id"),
            phase_id: r.get("phase_id"),
            parent_id: r.get("parent_id"),
            kind: parse_kind(&r.get::<String, _>("kind"))?,
            title: r.get("title"),
            summary: r.get("summary"),
            description_md: r.get("description_md"),
            severity: parse_severity(&r.get::<String, _>("severity"))?,
            difficulty: parse_difficulty(&r.get::<String, _>("difficulty"))?,
            mitre_attack_id: r.get("mitre_attack_id"),
            detection_hints: r.get("detection_hints"),
            ordinal: r.get::<i64, _>("ordinal") as i32,
            tags,
        }))
    }

    async fn list_snippets_for(&self, node_id: &str) -> Result<Vec<Snippet>, AppError> {
        let rows = sqlx::query(
            "SELECT id, node_id, shell, title, code, description, requires_admin, ordinal
             FROM snippets WHERE node_id = ? ORDER BY ordinal, id",
        )
        .bind(node_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|r| {
                Ok(Snippet {
                    id: r.get::<i64, _>("id"),
                    node_id: r.get("node_id"),
                    shell: parse_shell(&r.get::<String, _>("shell"))?,
                    title: r.get("title"),
                    code: r.get("code"),
                    description: r.get("description"),
                    requires_admin: r.get::<i64, _>("requires_admin") != 0,
                    ordinal: r.get::<i64, _>("ordinal") as i32,
                })
            })
            .collect()
    }

    async fn list_refs_for(&self, node_id: &str) -> Result<Vec<Reference>, AppError> {
        let rows = sqlx::query(
            "SELECT id, node_id, title, url, kind FROM refs WHERE node_id = ? ORDER BY id",
        )
        .bind(node_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|r| {
                Ok(Reference {
                    id: r.get::<i64, _>("id"),
                    node_id: r.get("node_id"),
                    title: r.get("title"),
                    url: r.get("url"),
                    kind: parse_ref_kind(&r.get::<String, _>("kind"))?,
                })
            })
            .collect()
    }

    async fn list_neighbours(
        &self,
        node_id: &str,
        kind: EdgeKind,
    ) -> Result<Vec<(String, String)>, AppError> {
        let rows = sqlx::query(
            "SELECT n.id AS id, n.title AS title
             FROM node_edges e
             JOIN nodes n ON n.id = e.target_id
             WHERE e.source_id = ? AND e.kind = ?
             ORDER BY n.phase_id, n.ordinal, n.id",
        )
        .bind(node_id)
        .bind(edge_kind_str(kind))
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| (r.get::<String, _>("id"), r.get::<String, _>("title")))
            .collect())
    }

    async fn search(&self, query: &str, limit: i64) -> Result<Vec<SearchHit>, AppError> {
        let fts_query = sanitize_fts(query);
        if fts_query.is_empty() {
            return Ok(Vec::new());
        }

        // snippet(table, col_index, prefix, suffix, ellipsis, n_tokens)
        // col_index = -1 → pick the best-matching column automatically.
        let rows = sqlx::query(
            "SELECT n.id   AS node_id,
                    n.title    AS title,
                    n.phase_id AS phase_id,
                    n.severity AS severity,
                    snippet(nodes_fts, -1, '<mark>', '</mark>', '…', 16) AS excerpt
             FROM nodes_fts
             JOIN nodes n ON n.id = nodes_fts.id
             WHERE nodes_fts MATCH ?
             ORDER BY rank
             LIMIT ?",
        )
        .bind(&fts_query)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|r| {
                Ok(SearchHit {
                    node_id: r.get("node_id"),
                    title: r.get("title"),
                    phase_id: r.get("phase_id"),
                    severity: parse_severity(&r.get::<String, _>("severity"))?,
                    snippet: sanitize_snippet(&r.get::<String, _>("excerpt")),
                })
            })
            .collect()
    }

    async fn meta(&self, key: &str) -> Result<Option<String>, AppError> {
        let v: Option<String> = sqlx::query_scalar("SELECT value FROM meta WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;
        Ok(v)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_snippet_allows_only_mark_tags() {
        // Plain text passthrough.
        assert_eq!(sanitize_snippet("hello world"), "hello world");
        // Normal FTS5 mark markers preserved.
        assert_eq!(
            sanitize_snippet("foo <mark>bar</mark> baz"),
            "foo <mark>bar</mark> baz"
        );
        // Injected script tags are escaped.
        assert_eq!(
            sanitize_snippet("<script>alert(1)</script>"),
            "&lt;script&gt;alert(1)&lt;/script&gt;"
        );
        // Injected img onerror is escaped.
        assert_eq!(
            sanitize_snippet("<img src=x onerror=alert(1)>"),
            "&lt;img src=x onerror=alert(1)&gt;"
        );
        // Mark around injected content: inner injection is escaped.
        assert_eq!(
            sanitize_snippet("<mark><script>x</script></mark>"),
            "<mark>&lt;script&gt;x&lt;/script&gt;</mark>"
        );
        // Ampersands in content are escaped.
        assert_eq!(sanitize_snippet("a & b"), "a &amp; b");
    }

    #[test]
    fn sanitize_strips_fts_syntax() {
        // Special chars dropped; remaining terms phrase-quoted with trailing `*`
        // (prefix query) and AND-joined.
        assert_eq!(sanitize_fts("unquoted service"), "\"unquoted\"* AND \"service\"*");
        assert_eq!(sanitize_fts(""), "");
        // `--` is also kept because `-` is an allowed char (not a SQL injection risk in FTS5 parameters).
        assert_eq!(sanitize_fts("MATCH(\"; DROP TABLE nodes; --"), "\"MATCH\"* AND \"DROP\"* AND \"TABLE\"* AND \"nodes\"* AND \"--\"*");
        assert_eq!(sanitize_fts("se-impersonate"), "\"se-impersonate\"*");
        // Only special chars -> empty
        assert_eq!(sanitize_fts(":()*?"), "");
    }

    #[test]
    fn parse_round_trips() {
        assert!(matches!(parse_severity("critical").unwrap(), Severity::Critical));
        assert!(matches!(parse_difficulty("oscp-basic").unwrap(), Difficulty::OscpBasic));
        assert!(matches!(parse_kind("technique").unwrap(), NodeKind::Technique));
        assert!(matches!(parse_edge_kind("prerequisite").unwrap(), EdgeKind::Prerequisite));
        assert!(matches!(parse_shell("powershell").unwrap(), Shell::Powershell));
        assert!(matches!(parse_ref_kind("mitre").unwrap(), RefKind::Mitre));
    }

    #[test]
    fn parse_rejects_unknown() {
        assert!(parse_severity("nuclear").is_err());
        assert!(parse_kind("godmode").is_err());
    }
}
