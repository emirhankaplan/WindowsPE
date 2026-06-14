//! Response DTOs — the contract the frontend reads.
//!
//! Rule: DTOs are **Serialize-only**. They are projections of domain types,
//! never mapped from a `Deserialize` body. Any inbound request DTOs live in
//! the handler module that consumes them (Step B).

pub mod envelope;
pub mod methodology;
pub mod node_detail;
pub mod search;

pub use envelope::{ApiError, ApiResponse};
pub use methodology::{EdgeDto, MethodologyDto, NodeSummaryDto, PhaseSummaryDto};
pub use node_detail::{NodeDetailDto, NodeRefDto, ReferenceDto, SnippetDto};
pub use search::{SearchHitDto, SearchResponseDto};
