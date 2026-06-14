use serde::{Deserialize, Serialize};

/// Severity rubric — drives the badge color in the UI.
///
/// Serde produces kebab-case strings (`"info"`, `"critical"`) which match
/// both the JSON content files and the SQLite `CHECK` constraint.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

/// Difficulty rubric — orthogonal to severity. Severity = impact; difficulty
/// = how realistic / how much tradecraft is required.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Difficulty {
    OscpBasic,
    OscpAdvanced,
    RedTeam,
}

/// What kind of node this is. Controls how React Flow renders it on the canvas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NodeKind {
    Phase,
    Category,
    Technique,
    Tool,
}

/// Edge semantics in the DAG.
///
/// * `Child` — tree parent → child.
/// * `Prerequisite` — `target` should typically be completed before `source`
///   makes sense (cross-phase allowed).
/// * `Related` — soft "see also" association.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EdgeKind {
    Child,
    Prerequisite,
    Related,
}

/// A methodology node (category, technique, or tool).
///
/// `tags` is stored as a separate join table in SQLite but exposed here as
/// a flat list because the domain layer is consumer-friendly, not row-shaped.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
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
    pub ordinal: i32,
    pub tags: Vec<String>,
}

/// One DAG edge between two nodes.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeEdge {
    pub source_id: String,
    pub target_id: String,
    pub kind: EdgeKind,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn severity_serializes_as_kebab() {
        assert_eq!(serde_json::to_string(&Severity::Critical).unwrap(), "\"critical\"");
        assert_eq!(serde_json::to_string(&Severity::Info).unwrap(), "\"info\"");
    }

    #[test]
    fn difficulty_serializes_as_kebab() {
        assert_eq!(serde_json::to_string(&Difficulty::OscpBasic).unwrap(), "\"oscp-basic\"");
        assert_eq!(serde_json::to_string(&Difficulty::RedTeam).unwrap(), "\"red-team\"");
    }

    #[test]
    fn node_kind_roundtrips() {
        for k in [NodeKind::Phase, NodeKind::Category, NodeKind::Technique, NodeKind::Tool] {
            let s = serde_json::to_string(&k).unwrap();
            let back: NodeKind = serde_json::from_str(&s).unwrap();
            assert_eq!(k, back);
        }
    }

    #[test]
    fn edge_kind_serializes() {
        assert_eq!(serde_json::to_string(&EdgeKind::Prerequisite).unwrap(), "\"prerequisite\"");
    }
}
