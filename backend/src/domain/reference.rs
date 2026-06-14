use serde::{Deserialize, Serialize};

/// Provenance of an external reference. Frontend uses this to pick an icon
/// and group references in the panel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RefKind {
    Mitre,
    Hacktricks,
    Msdoc,
    Cve,
    Blog,
    Tool,
    Paper,
}

/// External reference attached to a node (MITRE ATT&CK page, HackTricks
/// section, MS docs page, CVE, blog post, tool repository, paper).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reference {
    pub id: i64,
    pub node_id: String,
    pub title: String,
    pub url: String,
    pub kind: RefKind,
}
