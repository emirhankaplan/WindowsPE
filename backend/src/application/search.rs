//! Use case: full-text search across nodes.

use crate::application::repositories::NodeRepository;
use crate::error::AppError;
use crate::interfaces::dto::{SearchHitDto, SearchResponseDto};

/// Hard cap on results returned in one call. Frontend can paginate later if
/// we ever need it, but for ~110 nodes this never bites.
pub const MAX_LIMIT: i64 = 50;
pub const DEFAULT_LIMIT: i64 = 20;

pub async fn search(
    repo: &dyn NodeRepository,
    query: &str,
    limit: Option<i64>,
) -> Result<SearchResponseDto, AppError> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    let hits = repo.search(query, limit).await?;
    Ok(SearchResponseDto {
        query: query.to_owned(),
        hits: hits
            .into_iter()
            .map(|h| SearchHitDto {
                node_id: h.node_id,
                title: h.title,
                phase_id: h.phase_id,
                severity: h.severity,
                snippet: h.snippet,
            })
            .collect(),
    })
}
