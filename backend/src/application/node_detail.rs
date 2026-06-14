//! Use case: build the rich single-node DTO returned to the side-panel.

use crate::application::repositories::NodeRepository;
use crate::domain::EdgeKind;
use crate::error::AppError;
use crate::interfaces::dto::{NodeDetailDto, NodeRefDto, ReferenceDto, SnippetDto};

pub async fn build_node_detail(
    repo: &dyn NodeRepository,
    id: &str,
) -> Result<Option<NodeDetailDto>, AppError> {
    let node = match repo.get_node(id).await? {
        Some(n) => n,
        None => return Ok(None),
    };

    let (snippets, references, prerequisites, related) = tokio::try_join!(
        repo.list_snippets_for(id),
        repo.list_refs_for(id),
        repo.list_neighbours(id, EdgeKind::Prerequisite),
        repo.list_neighbours(id, EdgeKind::Related),
    )?;

    Ok(Some(NodeDetailDto {
        id: node.id,
        phase_id: node.phase_id,
        parent_id: node.parent_id,
        kind: node.kind,
        title: node.title,
        summary: node.summary,
        description_md: node.description_md,
        severity: node.severity,
        difficulty: node.difficulty,
        mitre_attack_id: node.mitre_attack_id,
        detection_hints: node.detection_hints,
        tags: node.tags,
        snippets: snippets
            .into_iter()
            .map(|s| SnippetDto {
                id: s.id,
                shell: s.shell,
                title: s.title,
                code: s.code,
                description: s.description,
                requires_admin: s.requires_admin,
            })
            .collect(),
        references: references
            .into_iter()
            .map(|r| ReferenceDto { title: r.title, url: r.url, kind: r.kind })
            .collect(),
        prerequisites: prerequisites
            .into_iter()
            .map(|(id, title)| NodeRefDto { id, title })
            .collect(),
        related: related
            .into_iter()
            .map(|(id, title)| NodeRefDto { id, title })
            .collect(),
    }))
}
