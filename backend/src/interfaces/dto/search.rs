use serde::Serialize;

use crate::domain::Severity;

/// Response shape for `GET /api/v1/search?q=…`.
///
/// The `snippet` field holds the FTS5-generated excerpt with `<mark>…</mark>`
/// tags around the matched terms — the frontend renders it raw inside a
/// sanitised container.
#[derive(Debug, Serialize)]
pub struct SearchResponseDto {
    pub query: String,
    pub hits: Vec<SearchHitDto>,
}

#[derive(Debug, Serialize)]
pub struct SearchHitDto {
    pub node_id: String,
    pub title: String,
    pub phase_id: String,
    pub severity: Severity,
    pub snippet: String,
}
