//! WindowsPE backend entry point.
//!
//! Boot sequence:
//!   1. `.env` (best-effort) → `Config::from_env`
//!   2. tracing-subscriber
//!   3. open SQLite pool → run migrations → seed content
//!   4. wrap pool in `SqliteNodeRepository`, plug into `AppState`
//!   5. build router → bind → serve with graceful shutdown

use std::net::SocketAddr;
use std::sync::Arc;

use tokio::net::TcpListener;
use tokio::signal;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod application;
mod config;
mod domain;
mod error;
mod infrastructure;
mod interfaces;
mod state;

use crate::application::repositories::NodeRepository;
use crate::config::Config;
use crate::infrastructure::sqlite::{open_pool, run_migrations, SqliteNodeRepository};
use crate::infrastructure::seed;
use crate::interfaces::router::build_router;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    let cfg = Config::from_env()?;

    init_tracing(&cfg.log_level);

    tracing::info!(
        bind_addr = %cfg.bind_addr,
        database  = %cfg.database_url,
        content   = ?cfg.content_dir,
        "WindowsPE backend booting"
    );

    let pool = open_pool(&cfg).await?;
    run_migrations(&pool).await?;
    seed::run(&pool, &cfg.content_dir).await?;

    let repo: Arc<dyn NodeRepository> = Arc::new(SqliteNodeRepository::new(pool));
    let bind_addr = cfg.bind_addr;
    let state = AppState::new(cfg, repo);
    let app = build_router(state);

    let listener = TcpListener::bind(bind_addr).await?;
    tracing::info!(%bind_addr, "listening");

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("server stopped cleanly");
    Ok(())
}

fn init_tracing(level: &str) {
    let filter =
        EnvFilter::try_new(level).unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c    => tracing::info!("SIGINT received"),
        _ = terminate => tracing::info!("SIGTERM received"),
    }
}
