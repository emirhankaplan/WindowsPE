use serde::{Deserialize, Serialize};

/// Which shell / language a snippet should be highlighted as.
///
/// `Text` is the escape hatch for prose-y "concept" notes that don't
/// represent runnable code.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Shell {
    Powershell,
    Cmd,
    Bash,
    C,
    Text,
}

/// A copy-to-clipboard snippet attached to a node.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Snippet {
    pub id: i64,
    pub node_id: String,
    pub shell: Shell,
    pub title: String,
    pub code: String,
    pub description: Option<String>,
    /// True only when the snippet itself needs an already-elevated context
    /// (e.g. dumping LSASS). UI surfaces this as a "post-exploit" badge.
    pub requires_admin: bool,
    pub ordinal: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_serializes_as_lowercase() {
        assert_eq!(serde_json::to_string(&Shell::Powershell).unwrap(), "\"powershell\"");
        assert_eq!(serde_json::to_string(&Shell::Cmd).unwrap(), "\"cmd\"");
        assert_eq!(serde_json::to_string(&Shell::C).unwrap(), "\"c\"");
    }
}
