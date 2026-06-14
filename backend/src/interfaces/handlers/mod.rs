//! Axum handlers. Each handler is a thin adapter: extract → use case → DTO.

pub mod health;
pub mod methodology;
pub mod nodes;
pub mod search;
