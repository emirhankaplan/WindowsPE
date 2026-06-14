//! Use case: assemble the full methodology graph DTO.

use crate::application::repositories::NodeRepository;
use crate::error::AppError;
use crate::interfaces::dto::{EdgeDto, MethodologyDto, NodeSummaryDto, PhaseSummaryDto};

pub async fn build_methodology(repo: &dyn NodeRepository) -> Result<MethodologyDto, AppError> {
    let (phases, nodes, edges, version) = tokio::try_join!(
        repo.list_phases(),
        repo.list_nodes(),
        repo.list_edges(),
        async {
            Ok::<String, AppError>(
                repo.meta("methodology_version")
                    .await?
                    .unwrap_or_else(|| "0.0.0".to_owned()),
            )
        },
    )?;

    Ok(MethodologyDto {
        version,
        phases: phases
            .into_iter()
            .map(|p| PhaseSummaryDto {
                id: p.id,
                title: p.title,
                ordinal: p.ordinal,
                icon: p.icon,
                accent_color: p.accent_color,
            })
            .collect(),
        nodes: nodes
            .into_iter()
            .map(|n| NodeSummaryDto {
                id: n.id,
                phase_id: n.phase_id,
                parent_id: n.parent_id,
                kind: n.kind,
                title: n.title,
                summary: n.summary,
                severity: n.severity,
                difficulty: n.difficulty,
                mitre_attack_id: n.mitre_attack_id,
                tags: n.tags,
            })
            .collect(),
        edges: edges
            .into_iter()
            .map(|e| EdgeDto { source: e.source_id, target: e.target_id, kind: e.kind })
            .collect(),
    })
}
