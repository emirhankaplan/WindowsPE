//! Unified application error type + Axum `IntoResponse` mapping.
//!
//! The rule: errors that originate from a client problem (`NotFound`,
//! `BadRequest`) surface their message verbatim. Everything else gets logged
//! in full at `error!` level and the client sees a generic "internal server
//! error" — no leaking of SQL state, panics, or stack frames into the wire
//! response.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use thiserror::Error;

use crate::interfaces::dto::envelope::ApiResponse;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    BadRequest(String),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    #[error("config error: {0}")]
    Config(#[from] figment::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("{0}")]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    fn classify(&self) -> (StatusCode, &'static str) {
        match self {
            AppError::NotFound(_)   => (StatusCode::NOT_FOUND,             "not_found"),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST,           "bad_request"),
            AppError::Database(_)
            | AppError::Migration(_)
            | AppError::Config(_)
            | AppError::Io(_)
            | AppError::Json(_)
            | AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = self.classify();
        let message = match &self {
            AppError::NotFound(m) | AppError::BadRequest(m) => m.clone(),
            _ => {
                tracing::error!(error = %self, "request failed");
                "internal server error".to_owned()
            }
        };
        let body: ApiResponse<()> = ApiResponse::<()>::err(code, message);
        (status, Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    #[test]
    fn not_found_maps_to_404() {
        let (s, c) = AppError::NotFound("x".into()).classify();
        assert_eq!(s, StatusCode::NOT_FOUND);
        assert_eq!(c, "not_found");
    }

    #[test]
    fn bad_request_maps_to_400() {
        let (s, c) = AppError::BadRequest("x".into()).classify();
        assert_eq!(s, StatusCode::BAD_REQUEST);
        assert_eq!(c, "bad_request");
    }

    #[test]
    fn db_maps_to_500() {
        let err = AppError::Database(sqlx::Error::RowNotFound);
        let (s, _) = err.classify();
        assert_eq!(s, StatusCode::INTERNAL_SERVER_ERROR);
    }
}
