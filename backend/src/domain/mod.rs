//! Domain layer — pure business types.
//!
//! Rule: nothing here imports `axum`, `sqlx`, `tower_http`, or any I/O crate.
//! These are the canonical entity shapes; persistence and transport types
//! convert to/from them at their respective boundaries.

pub mod node;
pub mod phase;
pub mod reference;
pub mod snippet;

pub use node::{Difficulty, EdgeKind, Node, NodeEdge, NodeKind, Severity};
pub use phase::Phase;
pub use reference::{RefKind, Reference};
pub use snippet::{Shell, Snippet};
