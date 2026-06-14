//! SQLite-backed adapters.

pub mod node_repository;

pub use node_repository::SqliteNodeRepository;

use std::time::Duration;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;

use crate::config::Config;
use crate::error::AppError;

/// Open the connection pool with sane defaults.
///
/// `foreign_keys` and WAL journal mode are per-connection pragmas, applied
/// here rather than inside a migration — SQLite refuses to switch journal
/// mode while a transaction is open, and SQLx wraps every migration in one.
pub async fn open_pool(cfg: &Config) -> Result<SqlitePool, AppError> {
    let opts: SqliteConnectOptions = cfg
        .database_url
        .parse()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("invalid DATABASE_URL: {e}")))?;

    let opts = opts
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(8)
        .acquire_timeout(Duration::from_secs(5))
        .connect_with(opts)
        .await?;
    Ok(pool)
}

/// Apply pending migrations from the in-crate `migrations/` directory.
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}
