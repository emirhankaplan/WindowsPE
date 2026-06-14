use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use crate::application::search::search as do_search;
use crate::error::AppError;
use crate::interfaces::dto::{ApiResponse, SearchResponseDto};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    #[serde(default)]
    pub limit: Option<i64>,
}

const MAX_Q_LEN: usize = 200;
/// Maximum number of whitespace-separated search terms accepted.
/// Limits FTS5 AND-chain length to keep query cost bounded.
const MAX_TERMS: usize = 10;

/// GET /api/v1/search?q=…&limit=…
pub async fn search(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<ApiResponse<SearchResponseDto>>, AppError> {
    let q = params.q.trim();
    if q.is_empty() {
        return Err(AppError::BadRequest("query parameter `q` is required".into()));
    }
    if q.len() > MAX_Q_LEN {
        return Err(AppError::BadRequest(format!(
            "query exceeds {MAX_Q_LEN} characters"
        )));
    }
    let term_count = q.split_whitespace().count();
    if term_count > MAX_TERMS {
        return Err(AppError::BadRequest(format!(
            "query contains too many terms (max {MAX_TERMS})"
        )));
    }

    let dto = do_search(state.repo.as_ref(), q, params.limit).await?;
    Ok(Json(ApiResponse::ok(dto)))
}
