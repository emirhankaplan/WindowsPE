use serde::Serialize;

use crate::domain::{Difficulty, NodeKind, RefKind, Severity, Shell};

/// Response shape for `GET /api/v1/nodes/:id`. Everything the side-panel
/// needs in one round trip: full description, every snippet body, references,
/// and the resolved prerequisites / related-node titles for cross-linking.
#[derive(Debug, Serialize)]
pub struct NodeDetailDto {
    pub id: String,
    pub phase_id: String,
    pub parent_id: Option<String>,
    pub kind: NodeKind,
    pub title: String,
    pub summary: String,
    pub description_md: String,
    pub severity: Severity,
    pub difficulty: Difficulty,
    pub mitre_attack_id: Option<String>,
    pub detection_hints: Option<String>,
    pub tags: Vec<String>,
    pub snippets: Vec<SnippetDto>,
    pub references: Vec<ReferenceDto>,
    pub prerequisites: Vec<NodeRefDto>,
    pub related: Vec<NodeRefDto>,
}

#[derive(Debug, Serialize)]
pub struct SnippetDto {
    pub id: i64,
    pub shell: Shell,
    pub title: String,
    pub code: String,
    pub description: Option<String>,
    pub requires_admin: bool,
}

#[derive(Debug, Serialize)]
pub struct ReferenceDto {
    pub title: String,
    pub url: String,
    pub kind: RefKind,
}

/// Lightweight node pointer for `prerequisites` / `related` lists — just enough
/// to render a clickable chip without paying for a full Node payload.
#[derive(Debug, Serialize)]
pub struct NodeRefDto {
    pub id: String,
    pub title: String,
}
