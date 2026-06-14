use axum::{
    body::Body,
    extract::State,
    http::{header, HeaderValue, StatusCode},
    response::Response,
};
use bytes::Bytes;

use crate::application::methodology::build_methodology;
use crate::error::AppError;
use crate::interfaces::dto::ApiResponse;
use crate::state::AppState;

/// GET /api/v1/methodology
///
/// Serves the full graph for React Flow. Snippet bodies are NOT included
/// here; the side-panel fetches them via `/nodes/:id` on click.
///
/// Cache strategy: pre-serialised JSON bytes keyed by methodology version.
/// On a hit we send the cached `Bytes` directly with an `ETag` derived from
/// the version, letting any downstream proxy or browser short-circuit on
/// `If-None-Match`.
pub async fn get_methodology(State(state): State<AppState>) -> Result<Response, AppError> {
    let version = state
        .repo
        .meta("methodology_version")
        .await?
        .unwrap_or_else(|| "0.0.0".to_owned());

    if let Some(bytes) = state.tree_cache.get(&version).await {
        return Ok(json_response(bytes, &version));
    }

    let dto = build_methodology(state.repo.as_ref()).await?;
    let body = serde_json::to_vec(&ApiResponse::ok(dto))?;
    let bytes = Bytes::from(body);
    state.tree_cache.insert(version.clone(), bytes.clone()).await;

    Ok(json_response(bytes, &version))
}

fn json_response(body: Bytes, version: &str) -> Response {
    let etag = format!("\"{version}\"");
    Response::builder()
        .status(StatusCode::OK)
        .header(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        )
        // `private` prevents CDN / shared-proxy caching of the methodology
        // graph. `must-revalidate` ensures stale copies are never served.
        .header(
            header::CACHE_CONTROL,
            HeaderValue::from_static("private, max-age=300, must-revalidate"),
        )
        .header(header::ETAG, HeaderValue::from_str(&etag).expect("ascii etag"))
        .body(Body::from(body))
        .expect("response is well-formed")
}
