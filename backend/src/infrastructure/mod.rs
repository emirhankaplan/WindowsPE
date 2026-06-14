//! Infrastructure layer — adapters that talk to the outside world.
//!
//! `sqlite` holds the concrete `NodeRepository` implementation.
//! `seed` populates the database from the git-versioned content tree on
//! boot when the content hash has drifted.

pub mod seed;
pub mod sqlite;
