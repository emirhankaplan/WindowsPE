//! Persistence ports.
//!
//! The application layer talks to storage exclusively through these traits;
//! the SQLite implementation lives in `infrastructure::sqlite`. Swapping to
//! Postgres later means a new module that implements `NodeRepository`
//! — nothing above this layer changes.

use async_trait::async_trait;

use crate::domain::{EdgeKind, Node, NodeEdge, Phase, Reference, Severity, Snippet};
use crate::error::AppError;

/// Tuple-like search hit returned from the repository before being mapped
/// to a wire DTO by the use-case layer.
#[derive(Debug, Clone)]
pub struct SearchHit {
    pub node_id: String,
    pub title: String,
    pub phase_id: String,
    pub severity: Severity,
    pub snippet: String,
}

#[async_trait]
pub trait NodeRepository: Send + Sync + 'static {
    /// Cheap connectivity check for the health endpoint.
    async fn ping(&self) -> Result<(), AppError>;

    async fn list_phases(&self) -> Result<Vec<Phase>, AppError>;
    async fn list_nodes(&self) -> Result<Vec<Node>, AppError>;
    async fn list_edges(&self) -> Result<Vec<NodeEdge>, AppError>;

    async fn get_node(&self, id: &str) -> Result<Option<Node>, AppError>;
    async fn list_snippets_for(&self, node_id: &str) -> Result<Vec<Snippet>, AppError>;
    async fn list_refs_for(&self, node_id: &str) -> Result<Vec<Reference>, AppError>;

    /// Resolved neighbour titles for a node along the given edge kind.
    /// Returns `(id, title)` pairs in the natural ordinal of the target.
    async fn list_neighbours(
        &self,
        node_id: &str,
        kind: EdgeKind,
    ) -> Result<Vec<(String, String)>, AppError>;

    /// FTS5 search. `query` is the **raw user input** — the implementation
    /// is responsible for sanitising it. `limit` caps result count.
    async fn search(&self, query: &str, limit: i64) -> Result<Vec<SearchHit>, AppError>;

    /// Read a single `meta` row by key.
    async fn meta(&self, key: &str) -> Result<Option<String>, AppError>;
}
