use serde::Serialize;

use crate::domain::{Difficulty, EdgeKind, NodeKind, Severity};

/// Response shape for `GET /api/v1/methodology` — the full graph the
/// frontend hands to React Flow. Snippet bodies are NOT included; the panel
/// lazy-loads them via `GET /api/v1/nodes/:id`.
#[derive(Debug, Serialize)]
pub struct MethodologyDto {
    pub version: String,
    pub phases: Vec<PhaseSummaryDto>,
    pub nodes: Vec<NodeSummaryDto>,
    pub edges: Vec<EdgeDto>,
}

#[derive(Debug, Serialize)]
pub struct PhaseSummaryDto {
    pub id: String,
    pub title: String,
    pub ordinal: i32,
    pub icon: Option<String>,
    pub accent_color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct NodeSummaryDto {
    pub id: String,
    pub phase_id: String,
    pub parent_id: Option<String>,
    pub kind: NodeKind,
    pub title: String,
    pub summary: String,
    pub severity: Severity,
    pub difficulty: Difficulty,
    pub mitre_attack_id: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct EdgeDto {
    pub source: String,
    pub target: String,
    pub kind: EdgeKind,
}
