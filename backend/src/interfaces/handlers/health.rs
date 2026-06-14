use axum::{extract::State, Json};
use serde_json::{json, Value};

use crate::error::AppError;
use crate::state::AppState;

/// Liveness + readiness rolled into one endpoint. Pings the DB so a healthy
/// 200 means "process is up AND database is reachable".
pub async fn health(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    state.repo.ping().await?;
    let version = state
        .repo
        .meta("methodology_version")
        .await?
        .unwrap_or_else(|| "unknown".to_owned());
    Ok(Json(json!({
        "status": "ok",
        "methodology_version": version,
    })))
}
