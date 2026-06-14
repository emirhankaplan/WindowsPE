use axum::{
    extract::{Path, State},
    Json,
};

use crate::application::node_detail::build_node_detail;
use crate::error::AppError;
use crate::interfaces::dto::{ApiResponse, NodeDetailDto};
use crate::state::AppState;

const MAX_ID_LEN: usize = 64;

/// GET /api/v1/nodes/:id
pub async fn get_node(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<NodeDetailDto>>, AppError> {
    if id.is_empty() || id.len() > MAX_ID_LEN {
        return Err(AppError::BadRequest("invalid node id".into()));
    }
    if !id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
        return Err(AppError::BadRequest("invalid node id".into()));
    }

    match build_node_detail(state.repo.as_ref(), &id).await? {
        Some(dto) => Ok(Json(ApiResponse::ok(dto))),
        None => Err(AppError::NotFound(format!("node {id} not found"))),
    }
}
