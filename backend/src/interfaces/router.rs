//! Axum route composition + middleware stack.

use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{header, HeaderName, HeaderValue, Method},
    routing::get,
    Router,
};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    set_header::SetResponseHeaderLayer,
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::config::Config;
use crate::interfaces::handlers;
use crate::state::AppState;

/// Build the fully-decorated app router.
pub fn build_router(state: AppState) -> Router {
    let cors = build_cors(state.config.as_ref());

    // Rate limiting: 30 requests/second sustained, burst up to 60.
    // Uses a per-IP token-bucket via the `governor` crate.
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(30)
            .burst_size(60)
            .finish()
            .expect("valid governor config"),
    );

    Router::new()
        .nest("/api/v1", api_routes())
        .with_state(state)
        // Outer-most: request id propagation.
        .layer(PropagateRequestIdLayer::x_request_id())
        // Security response headers — defend-in-depth for clients that hit the
        // API directly (or through a proxy that forwards these).
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-permitted-cross-domain-policies"),
            HeaderValue::from_static("none"),
        ))
        // Compress large JSON responses (the methodology graph in particular).
        .layer(CompressionLayer::new())
        // Per-request tracing span.
        .layer(TraceLayer::new_for_http())
        // CORS for the Vercel frontend.
        .layer(cors)
        // IP-based rate limiting — 30 req/s sustained, burst 60.
        .layer(GovernorLayer {
            config: governor_conf,
        })
        // Hard request timeout — well above expected SQLite query latency.
        .layer(TimeoutLayer::new(Duration::from_secs(10)))
        // Inner-most: assign a request id if upstream didn't.
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
}

fn api_routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(handlers::health::health))
        .route("/methodology", get(handlers::methodology::get_methodology))
        .route("/nodes/:id", get(handlers::nodes::get_node))
        .route("/search", get(handlers::search::search))
}

fn build_cors(config: &Config) -> CorsLayer {
    let origins: Vec<HeaderValue> = config
        .cors_origins_vec()
        .iter()
        .filter_map(|o| HeaderValue::from_str(o).ok())
        .collect();

    // Fail-safe: if the origins list parses to empty (e.g. placeholder value,
    // missing env var, or all entries failed HeaderValue parsing) we refuse ALL
    // cross-origin requests instead of falling back to `AllowOrigin::any()`.
    // An open CORS policy would allow any website to make credentialed requests
    // to the API, defeating the purpose of a configured allowlist.
    if origins.is_empty() {
        tracing::error!(
            "CORS origins list is empty — no cross-origin requests will be allowed. \
             Set WINDOWSPE_CORS_ORIGINS to a comma-separated list of valid frontend origins."
        );
    }
    let allow_origin = if origins.is_empty() {
        AllowOrigin::list(Vec::<HeaderValue>::new())
    } else {
        AllowOrigin::list(origins)
    };

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([Method::GET])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
        .max_age(Duration::from_secs(86_400))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;

    // -----------------------------------------------------------------------
    // CORS fail-closed: empty / invalid origins must yield an empty list
    // -----------------------------------------------------------------------

    #[test]
    fn cors_empty_origins_fail_closed() {
        let cfg = Config {
            cors_origins: "".into(),
            ..Config::default()
        };
        // cors_origins_vec() must return an empty vec so build_cors picks
        // the deny-all branch instead of AllowOrigin::any().
        assert!(cfg.cors_origins_vec().is_empty());
    }

    #[test]
    fn cors_invalid_header_value_is_dropped() {
        // A placeholder-like string that is not a valid HTTP header value
        // must be dropped by HeaderValue::from_str so the list collapses to
        // empty — triggering the fail-closed branch.
        // "CHANGE_ME" has no scheme so HeaderValue parses OK but the
        // config test verifies we pass the right origin string.
        // What we care about here: a totally unparseable value (contains
        // spaces / control chars) is dropped.
        let bad = Config {
            cors_origins: "https://ok.example, \x00bad".into(),
            ..Config::default()
        };
        // The null-byte origin fails HeaderValue::from_str and is silently dropped.
        let origins: Vec<HeaderValue> = bad
            .cors_origins_vec()
            .iter()
            .filter_map(|o| HeaderValue::from_str(o).ok())
            .collect();
        // Only the valid "https://ok.example" survives.
        assert_eq!(origins.len(), 1);
    }

    #[test]
    fn cors_whitespace_only_is_fail_closed() {
        // If every entry is whitespace, cors_origins_vec() trims + filters
        // and returns empty → fail-closed.
        let cfg = Config {
            cors_origins: "  ,  ,   ".into(),
            ..Config::default()
        };
        assert!(cfg.cors_origins_vec().is_empty());
    }

    // -----------------------------------------------------------------------
    // Rate-limit: governor config must build without panic
    // -----------------------------------------------------------------------

    #[test]
    fn governor_config_builds_without_panic() {
        // If GovernorConfigBuilder panics with `expect` on invalid settings
        // (e.g. per_second=0), this test catches it at compile+run time.
        let conf = GovernorConfigBuilder::default()
            .per_second(30)
            .burst_size(60)
            .finish();
        assert!(conf.is_some(), "governor config should be valid");
    }
}
