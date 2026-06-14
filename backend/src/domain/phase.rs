use serde::{Deserialize, Serialize};

/// A top-level methodology phase (Enumeration, Service Misconfig, …).
///
/// `id` is the human-readable slug used as the SQLite primary key and as
/// a stable URL component on the frontend.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Phase {
    pub id: String,
    pub ordinal: i32,
    pub title: String,
    pub summary: String,
    pub icon: Option<String>,
    pub accent_color: Option<String>,
}
