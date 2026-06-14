//! Application layer — use cases that compose domain types via repositories.
//!
//! Use cases here intentionally stay thin: they're the place to add
//! cross-cutting concerns later (caching, authorisation, audit logging)
//! without touching either the handler layer or the persistence layer.

pub mod methodology;
pub mod node_detail;
pub mod repositories;
pub mod search;
