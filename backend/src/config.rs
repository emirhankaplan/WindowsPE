//! Layered configuration loader.
//!
//! Source priority (lowest → highest):
//! 1. Built-in defaults (`Config::default()`)
//! 2. `WINDOWSPE_*` environment variables
//!
//! `.env` files are loaded by `main` via `dotenvy` before this runs, so they
//! count as environment variables. To add a TOML override file later, append
//! a `figment::providers::Toml::file(...)` layer between the two.

use std::net::SocketAddr;
use std::path::PathBuf;

use figment::{
    providers::{Env, Serialized},
    Figment,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Listening socket — `127.0.0.1:8080` by default.
    pub bind_addr: SocketAddr,

    /// SQLx connection URL. `sqlite://./windowspe.db?mode=rwc` creates the
    /// file on first run.
    pub database_url: String,

    /// Path (relative to backend/ or absolute) to the git-versioned content
    /// tree that the seeder reads at startup.
    pub content_dir: PathBuf,

    /// `tracing-subscriber` EnvFilter directive (e.g. `info`, `debug,sqlx=warn`).
    pub log_level: String,

    /// TTL for the in-memory methodology-tree cache.
    pub cache_ttl_secs: u64,

    /// Comma-separated allowlist of CORS origins.
    pub cors_origins: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind_addr: "127.0.0.1:8080".parse().expect("hard-coded default is valid"),
            database_url: "sqlite://./windowspe.db?mode=rwc".to_string(),
            content_dir: PathBuf::from("../content"),
            log_level: "info".to_string(),
            cache_ttl_secs: 300,
            cors_origins: "http://localhost:3000".to_string(),
        }
    }
}

impl Config {
    /// Build a `Config` from defaults + `WINDOWSPE_*` env vars.
    pub fn from_env() -> Result<Self, figment::Error> {
        Figment::from(Serialized::defaults(Config::default()))
            .merge(Env::prefixed("WINDOWSPE_"))
            .extract()
    }

    /// Parse `cors_origins` into the trimmed, non-empty origins list.
    pub fn cors_origins_vec(&self) -> Vec<String> {
        self.cors_origins
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_valid() {
        let c = Config::default();
        assert_eq!(c.bind_addr.port(), 8080);
        assert!(c.database_url.starts_with("sqlite://"));
        assert_eq!(c.cors_origins_vec(), vec!["http://localhost:3000"]);
    }

    #[test]
    fn cors_origins_splits_and_trims() {
        let c = Config {
            cors_origins: " https://a.example , https://b.example,, ".into(),
            ..Config::default()
        };
        assert_eq!(c.cors_origins_vec(), vec!["https://a.example", "https://b.example"]);
    }
}
