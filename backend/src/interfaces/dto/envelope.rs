use serde::Serialize;

/// Uniform `{ data, error }` envelope. Exactly one of the two is `Some`.
///
/// Constructors enforce the invariant; clients can pattern-match on
/// `data.is_some()` without worrying about partially populated responses.
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self { data: Some(data), error: None }
    }

    pub fn err(code: impl Into<String>, message: impl Into<String>) -> ApiResponse<T> {
        ApiResponse {
            data: None,
            error: Some(ApiError { code: code.into(), message: message.into() }),
        }
    }
}

impl ApiError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self { code: code.into(), message: message.into() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ok_envelope_shape() {
        let env = ApiResponse::ok(serde_json::json!({ "v": 1 }));
        let s = serde_json::to_string(&env).unwrap();
        assert!(s.contains("\"data\":{\"v\":1}"));
        assert!(s.contains("\"error\":null"));
    }

    #[test]
    fn err_envelope_shape() {
        let env: ApiResponse<()> = ApiResponse::<()>::err("not_found", "node missing");
        let s = serde_json::to_string(&env).unwrap();
        assert!(s.contains("\"data\":null"));
        assert!(s.contains("\"code\":\"not_found\""));
        assert!(s.contains("\"message\":\"node missing\""));
    }
}
