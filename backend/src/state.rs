//! Process-wide application state shared by every handler.
//!
//! Axum requires state to be `Clone`. Every field here is internally
//! ref-counted (`Arc`, `SqlitePool` inside `dyn NodeRepository`, `moka`
//! cache), so clones are cheap pointer copies.

use std::sync::Arc;
use std::time::Duration;

use bytes::Bytes;
use moka::future::Cache;

use crate::application::repositories::NodeRepository;
use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub repo: Arc<dyn NodeRepository>,
    pub config: Arc<Config>,
    /// Pre-serialised methodology graph bytes, keyed by methodology version.
    /// A re-seed bumps the version implicitly via content/methodology.json,
    /// invalidating the cache without any manual flush.
    pub tree_cache: Cache<String, Bytes>,
}

impl AppState {
    pub fn new(config: Config, repo: Arc<dyn NodeRepository>) -> Self {
        let tree_cache = Cache::builder()
            .max_capacity(64)
            .time_to_live(Duration::from_secs(config.cache_ttl_secs))
            .build();
        Self { repo, config: Arc::new(config), tree_cache }
    }
}
