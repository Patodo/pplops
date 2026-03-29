use std::collections::{HashMap, HashSet};

use sea_orm::DatabaseConnection;
use tokio::sync::RwLock;

use crate::data_access::cache::{self, DataCache};
use crate::models::work_item::Model as WiModel;
use crate::repositories;
use crate::services::work_item::{
    CreateWorkItemPayload, SaveWorkItemOrchestrationPayload, UpdateWorkItemPayload, WorkItemDependencyEdgeDto,
    WorkItemDto, WorkItemListQuery, WorkItemListResult, WorkItemOrchestrationDto, WorkItemParentOption,
};

fn normalize_page(v: Option<u64>) -> u64 {
    match v {
        Some(0) | None => 1,
        Some(page) => page,
    }
}

fn normalize_page_size(v: Option<u64>) -> u64 {
    match v {
        Some(0) | None => 10,
        Some(s) => s.min(100),
    }
}

fn next_child_kind(parent_kind: &str) -> Option<&'static str> {
    match parent_kind {
        "project" => Some("requirement"),
        "requirement" => Some("task"),
        "task" => Some("subtask"),
        _ => None,
    }
}

fn has_children(map: &HashMap<i32, WiModel>, id: i32, kind: &str) -> bool {
    let Some(ck) = next_child_kind(kind) else {
        return false;
    };
    map.values()
        .any(|w| w.parent_id == Some(id) && w.kind == ck)
}

fn keyword_match(m: &WiModel, keyword: &str) -> bool {
    let t = keyword.trim();
    if t.is_empty() {
        return true;
    }
    let tl = t.to_lowercase();
    m.title.to_lowercase().contains(&tl)
        || m.item_id.to_lowercase().contains(&tl)
        || m.owner.to_lowercase().contains(&tl)
}

fn filter_work_items(models: &[WiModel], q: &repositories::work_item::WorkItemListQuery) -> Vec<WiModel> {
    models
        .iter()
        .cloned()
        .filter(|m| {
            if let Some(ref k) = q.kind {
                if !k.trim().is_empty() && m.kind != k.trim() {
                    return false;
                }
            }
            if let Some(pid) = q.parent_id {
                if m.parent_id != Some(pid) {
                    return false;
                }
            }
            if let Some(ref kw) = q.keyword {
                if !keyword_match(m, kw) {
                    return false;
                }
            }
            if let Some(ref st) = q.status {
                if !st.trim().is_empty() && m.status != st.trim() {
                    return false;
                }
            }
            if let Some(pr) = q.priority {
                if m.priority != pr {
                    return false;
                }
            }
            true
        })
        .collect()
}

fn sort_work_items(v: &mut [WiModel], q: &repositories::work_item::WorkItemListQuery) {
    let asc = matches!(q.sort_order.as_deref(), Some("ascend") | Some("asc"));
    match q.sort_field.as_deref() {
        Some("updatedAt") => {
            if asc {
                v.sort_by(|a, b| a.updated_at.cmp(&b.updated_at).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then_with(|| a.id.cmp(&b.id)));
            }
        }
        Some("title") => {
            if asc {
                v.sort_by(|a, b| a.title.cmp(&b.title).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.title.cmp(&a.title).then_with(|| a.id.cmp(&b.id)));
            }
        }
        Some("priority") => {
            if asc {
                v.sort_by(|a, b| a.priority.cmp(&b.priority).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.priority.cmp(&a.priority).then_with(|| a.id.cmp(&b.id)));
            }
        }
        _ => {
            if q.parent_id.is_some() {
                v.sort_by(|a, b| {
                    a.priority
                        .cmp(&b.priority)
                        .then_with(|| b.updated_at.cmp(&a.updated_at))
                        .then_with(|| a.id.cmp(&b.id))
                });
            } else {
                v.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then_with(|| a.id.cmp(&b.id)));
            }
        }
    }
}

fn to_dto(m: WiModel, parents_with_children: &HashSet<i32>) -> WorkItemDto {
    WorkItemDto {
        has_children: parents_with_children.contains(&m.id),
        id: m.id,
        item_id: m.item_id,
        kind: m.kind,
        parent_id: m.parent_id,
        title: m.title,
        status: m.status,
        priority: m.priority,
        owner: m.owner,
        content: m.content,
        effort: m.effort,
        plan_month: m.plan_month,
        planned_hours: m.planned_hours,
        actual_hours: m.actual_hours,
        due_date: m.due_date,
        updated_at: m.updated_at,
    }
}

fn compute_parents_with_children_for_page(map: &HashMap<i32, WiModel>, page_items: &[WiModel]) -> HashSet<i32> {
    let mut ids_by_child_kind: std::collections::HashMap<String, Vec<i32>> = std::collections::HashMap::new();
    for item in page_items {
        let child_kind = match item.kind.as_str() {
            "project" => Some("requirement"),
            "requirement" => Some("task"),
            "task" => Some("subtask"),
            _ => None,
        };
        if let Some(ck) = child_kind {
            ids_by_child_kind.entry(ck.to_owned()).or_default().push(item.id);
        }
    }
    let mut out = HashSet::new();
    for (child_kind, parent_ids) in ids_by_child_kind {
        for pid in parent_ids {
            if map.values().any(|w| {
                w.kind == child_kind && w.parent_id == Some(pid)
            }) {
                out.insert(pid);
            }
        }
    }
    out
}

async fn list_work_items_from_cache(
    cache: &RwLock<DataCache>,
    query: WorkItemListQuery,
) -> Result<WorkItemListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let g = cache.read().await;
    let all: Vec<WiModel> = g.work_items.values().cloned().collect();
    let repo_q = repositories::work_item::WorkItemListQuery {
        page,
        page_size,
        kind: query.kind,
        parent_id: query.parent_id,
        keyword: query.keyword,
        status: query.status,
        priority: query.priority,
        sort_field: query.sort_field,
        sort_order: query.sort_order,
    };
    drop(g);

    let mut filtered = filter_work_items(&all, &repo_q);
    sort_work_items(&mut filtered, &repo_q);
    let total = filtered.len() as u64;
    let start = (page.saturating_sub(1)) * page_size;
    let page_items: Vec<WiModel> = filtered
        .into_iter()
        .skip(start as usize)
        .take(page_size as usize)
        .collect();

    let g = cache.read().await;
    let parents = compute_parents_with_children_for_page(&g.work_items, &page_items);
    let items: Vec<WorkItemDto> = page_items
        .into_iter()
        .map(|m| to_dto(m, &parents))
        .collect();
    drop(g);

    Ok(WorkItemListResult {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn list_work_items(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    query: WorkItemListQuery,
) -> Result<WorkItemListResult, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        list_work_items_from_cache(cache, query).await
    } else {
        crate::services::work_item::list_work_items(db, query).await
    }
}

fn build_default_content(kind: &str, item_id: &str) -> String {
    format!("## {}\n\n<!-- {} -->\n", kind, item_id)
}

pub async fn get_work_item_detail(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    id: i32,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let Some(model) = g.work_items.get(&id).cloned() else {
            return Err(sea_orm::DbErr::Custom("work item not found".to_owned()));
        };
        let has_ch = has_children(&g.work_items, id, &model.kind);
        let content = if model.content.trim().is_empty() {
            build_default_content(&model.kind, &model.item_id)
        } else {
            model.content.clone()
        };
        return Ok(WorkItemDto {
            has_children: has_ch,
            id: model.id,
            item_id: model.item_id,
            kind: model.kind,
            parent_id: model.parent_id,
            title: model.title,
            status: model.status,
            priority: model.priority,
            owner: model.owner,
            content,
            effort: model.effort,
            plan_month: model.plan_month,
            planned_hours: model.planned_hours,
            actual_hours: model.actual_hours,
            due_date: model.due_date,
            updated_at: model.updated_at,
        });
    }
    crate::services::work_item::get_work_item_detail(db, id).await
}

pub async fn list_parent_projects(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let mut rows: Vec<_> = g.work_items.values().filter(|m| m.kind == "project").collect::<Vec<_>>();
        rows.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        return Ok(
            rows
                .into_iter()
                .map(|m| WorkItemParentOption {
                    id: m.id,
                    item_id: m.item_id.clone(),
                    title: m.title.clone(),
                })
                .collect(),
        );
    }
    crate::services::work_item::list_parent_projects(db).await
}

pub async fn list_parent_requirements(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let mut rows: Vec<_> = g.work_items.values().filter(|m| m.kind == "requirement").collect::<Vec<_>>();
        rows.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        return Ok(
            rows
                .into_iter()
                .map(|m| WorkItemParentOption {
                    id: m.id,
                    item_id: m.item_id.clone(),
                    title: m.title.clone(),
                })
                .collect(),
        );
    }
    crate::services::work_item::list_parent_requirements(db).await
}

pub async fn list_parent_tasks(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let mut rows: Vec<_> = g.work_items.values().filter(|m| m.kind == "task").collect::<Vec<_>>();
        rows.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        return Ok(
            rows
                .into_iter()
                .map(|m| WorkItemParentOption {
                    id: m.id,
                    item_id: m.item_id.clone(),
                    title: m.title.clone(),
                })
                .collect(),
        );
    }
    crate::services::work_item::list_parent_tasks(db).await
}

pub async fn get_work_item_orchestration(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    parent_id: i32,
) -> Result<WorkItemOrchestrationDto, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let Some(parent) = g.work_items.get(&parent_id) else {
            return Err(sea_orm::DbErr::Custom("parent not found".to_owned()));
        };
        let Some(child_kind) = next_child_kind(parent.kind.as_str()) else {
            return Err(sea_orm::DbErr::Custom("no child kind for parent".to_owned()));
        };
        let mut children: Vec<_> = g
            .work_items
            .values()
            .filter(|w| w.parent_id == Some(parent_id) && w.kind == child_kind)
            .cloned()
            .collect();
        children.sort_by(|a, b| {
            a.priority
                .cmp(&b.priority)
                .then_with(|| b.updated_at.cmp(&a.updated_at))
                .then_with(|| a.id.cmp(&b.id))
        });
        let child_ids: Vec<i32> = children.iter().map(|c| c.id).collect();
        let child_set: HashSet<i32> = child_ids.iter().copied().collect();
        let dependencies: Vec<_> = g
            .dependencies
            .iter()
            .filter(|e| child_set.contains(&e.predecessor_id) && child_set.contains(&e.successor_id))
            .map(|e| WorkItemDependencyEdgeDto {
                predecessor_id: e.predecessor_id,
                successor_id: e.successor_id,
            })
            .collect();
        let items: Vec<WorkItemDto> = children
            .into_iter()
            .map(|m| WorkItemDto {
                has_children: has_children(&g.work_items, m.id, &m.kind),
                id: m.id,
                item_id: m.item_id,
                kind: m.kind,
                parent_id: m.parent_id,
                title: m.title,
                status: m.status,
                priority: m.priority,
                owner: m.owner,
                content: m.content,
                effort: m.effort,
                plan_month: m.plan_month,
                planned_hours: m.planned_hours,
                actual_hours: m.actual_hours,
                due_date: m.due_date,
                updated_at: m.updated_at,
            })
            .collect();
        return Ok(WorkItemOrchestrationDto {
            items,
            dependencies,
        });
    }
    crate::services::work_item::get_work_item_orchestration(db, parent_id).await
}

async fn sync_work_item_row(db: &DatabaseConnection, cache: &RwLock<DataCache>, id: i32) {
    if let Ok(Some(m)) = repositories::work_item::get_work_item_by_id(db, id).await {
        let mut g = cache.write().await;
        g.work_items.insert(id, m);
    }
}

pub async fn create_work_item(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    payload: CreateWorkItemPayload,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    let dto = crate::services::work_item::create_work_item(db, payload).await?;
    if cache::cache_ready(cache).await {
        sync_work_item_row(db, cache, dto.id).await;
    }
    Ok(dto)
}

pub async fn update_work_item(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    payload: UpdateWorkItemPayload,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    let dto = crate::services::work_item::update_work_item(db, payload).await?;
    if cache::cache_ready(cache).await {
        sync_work_item_row(db, cache, dto.id).await;
    }
    Ok(dto)
}

pub async fn delete_work_item(db: &DatabaseConnection, cache: &RwLock<DataCache>, id: i32) -> Result<(), sea_orm::DbErr> {
    crate::services::work_item::delete_work_item(db, id).await?;
    if cache::cache_ready(cache).await {
        let mut g = cache.write().await;
        g.work_items.remove(&id);
        g.dependencies
            .retain(|e| e.predecessor_id != id && e.successor_id != id);
    }
    Ok(())
}

pub async fn save_work_item_orchestration(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    payload: SaveWorkItemOrchestrationPayload,
) -> Result<(), sea_orm::DbErr> {
    let item_ids: Vec<i32> = payload.items.iter().map(|i| i.id).collect();
    crate::services::work_item::save_work_item_orchestration(db, payload).await?;
    if cache::cache_ready(cache).await {
        for id in item_ids {
            sync_work_item_row(db, cache, id).await;
        }
        cache::reload_dependencies(db, cache).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::work_item::WorkItemListQuery as RepoQ;

    fn wi(
        id: i32,
        kind: &str,
        parent_id: Option<i32>,
        title: &str,
        item_id: &str,
        priority: i32,
        updated_at: i64,
    ) -> WiModel {
        WiModel {
            id,
            item_id: item_id.to_string(),
            kind: kind.to_string(),
            parent_id,
            title: title.to_string(),
            status: "new".to_string(),
            priority,
            owner: "alice".to_string(),
            content: String::new(),
            effort: None,
            plan_month: None,
            planned_hours: None,
            actual_hours: None,
            due_date: None,
            updated_at,
            created_at: 0,
        }
    }

    #[test]
    fn keyword_match_is_case_insensitive_on_title() {
        let m = wi(1, "task", None, "Hello World", "T-1", 100, 1);
        assert!(keyword_match(&m, "hello"));
        assert!(keyword_match(&m, "WORLD"));
        assert!(!keyword_match(&m, "zzz"));
    }

    #[test]
    fn filter_work_items_kind_and_parent() {
        let rows = vec![
            wi(1, "requirement", Some(10), "a", "R-1", 1, 1),
            wi(2, "task", Some(20), "b", "T-1", 1, 1),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            kind: Some("requirement".to_string()),
            parent_id: Some(10),
            keyword: None,
            status: None,
            priority: None,
            sort_field: None,
            sort_order: None,
        };
        let out = filter_work_items(&rows, &q);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, 1);
    }

    #[test]
    fn filter_work_items_priority() {
        let rows = vec![
            wi(1, "task", None, "a", "T-1", 5, 1),
            wi(2, "task", None, "b", "T-2", 9, 1),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            kind: None,
            parent_id: None,
            keyword: None,
            status: None,
            priority: Some(9),
            sort_field: None,
            sort_order: None,
        };
        let out = filter_work_items(&rows, &q);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, 2);
    }

    #[test]
    fn sort_default_root_desc_by_updated_at() {
        let mut rows = vec![
            wi(1, "project", None, "a", "P-1", 100, 10),
            wi(2, "project", None, "b", "P-2", 100, 50),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            kind: None,
            parent_id: None,
            keyword: None,
            status: None,
            priority: None,
            sort_field: None,
            sort_order: None,
        };
        sort_work_items(&mut rows, &q);
        assert_eq!(rows[0].id, 2);
        assert_eq!(rows[1].id, 1);
    }

    #[test]
    fn sort_under_parent_by_priority_asc_then_updated_desc() {
        let mut rows = vec![
            wi(1, "task", Some(99), "a", "T-1", 200, 100),
            wi(2, "task", Some(99), "b", "T-2", 100, 50),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            kind: None,
            parent_id: Some(99),
            keyword: None,
            status: None,
            priority: None,
            sort_field: None,
            sort_order: None,
        };
        sort_work_items(&mut rows, &q);
        assert_eq!(rows[0].id, 2);
        assert_eq!(rows[1].id, 1);
    }

    #[test]
    fn compute_parents_marks_when_child_exists() {
        let mut map = HashMap::new();
        map.insert(10, wi(10, "project", None, "p", "P-1", 100, 1));
        map.insert(11, wi(11, "requirement", Some(10), "r", "R-1", 100, 1));
        let page = vec![map[&10].clone()];
        let parents = compute_parents_with_children_for_page(&map, &page);
        assert!(parents.contains(&10));
    }

    #[test]
    fn has_children_true_when_matching_child_kind() {
        let mut map = HashMap::new();
        map.insert(10, wi(10, "project", None, "p", "P-1", 100, 1));
        map.insert(11, wi(11, "requirement", Some(10), "r", "R-1", 100, 1));
        assert!(has_children(&map, 10, "project"));
        assert!(!has_children(&map, 11, "subtask"));
    }

    #[test]
    fn pagination_slice_total_and_page_items() {
        let rows: Vec<_> = (1..=5)
            .map(|i| wi(i, "task", None, "t", &format!("T-{i}"), i * 10, i as i64))
            .collect();
        let q = RepoQ {
            page: 2,
            page_size: 2,
            kind: None,
            parent_id: None,
            keyword: None,
            status: None,
            priority: None,
            sort_field: Some("updatedAt".to_string()),
            sort_order: Some("ascend".to_string()),
        };
        let mut filtered = filter_work_items(&rows, &q);
        sort_work_items(&mut filtered, &q);
        let total = filtered.len() as u64;
        let page = normalize_page(Some(2));
        let page_size = normalize_page_size(Some(2));
        let start = (page.saturating_sub(1)) * page_size;
        let page_items: Vec<_> = filtered
            .into_iter()
            .skip(start as usize)
            .take(page_size as usize)
            .collect();
        assert_eq!(total, 5);
        assert_eq!(page_items.len(), 2);
        assert_eq!(page_items[0].id, 3);
        assert_eq!(page_items[1].id, 4);
    }
}
