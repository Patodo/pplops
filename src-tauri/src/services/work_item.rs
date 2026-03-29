use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::repositories;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkItemListQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub kind: Option<String>,
    pub parent_id: Option<i32>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkItemPayload {
    pub kind: String,
    pub parent_id: Option<i32>,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub content: Option<String>,
    pub effort: Option<f64>,
    pub plan_month: Option<String>,
    pub planned_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkItemPayload {
    pub id: i32,
    pub parent_id: Option<i32>,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub content: Option<String>,
    pub effort: Option<f64>,
    pub plan_month: Option<String>,
    pub planned_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkItemDto {
    pub id: i32,
    pub item_id: String,
    pub kind: String,
    pub parent_id: Option<i32>,
    pub has_children: bool,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub content: String,
    pub effort: Option<f64>,
    pub plan_month: Option<String>,
    pub planned_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub due_date: Option<String>,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkItemParentOption {
    pub id: i32,
    pub item_id: String,
    pub title: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkItemListResult {
    pub items: Vec<WorkItemDto>,
    pub total: u64,
    pub page: u64,
    pub page_size: u64,
}

fn now_ts() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_secs() as i64,
        Err(_) => 0,
    }
}

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

fn trim_or_default(value: String, default: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        default.to_owned()
    } else {
        trimmed.to_owned()
    }
}

fn normalize_kind(value: &str) -> String {
    match value {
        "project" => "project".to_owned(),
        "requirement" => "requirement".to_owned(),
        "task" => "task".to_owned(),
        "subtask" => "subtask".to_owned(),
        _ => "task".to_owned(),
    }
}

fn validate_parent_rule(kind: &str, parent_id: Option<i32>, parent_kind: Option<String>) -> Result<(), sea_orm::DbErr> {
    match kind {
        "project" => {
            if parent_id.is_some() {
                return Err(sea_orm::DbErr::Custom("project must not have parent".to_owned()));
            }
        }
        "requirement" => {
            if parent_id.is_none() || parent_kind.as_deref() != Some("project") {
                return Err(sea_orm::DbErr::Custom("requirement must have project parent".to_owned()));
            }
        }
        "task" => {
            if parent_id.is_none() || parent_kind.as_deref() != Some("requirement") {
                return Err(sea_orm::DbErr::Custom("task must have requirement parent".to_owned()));
            }
        }
        "subtask" => {
            if parent_id.is_none() || parent_kind.as_deref() != Some("task") {
                return Err(sea_orm::DbErr::Custom("subtask must have task parent".to_owned()));
            }
        }
        _ => {
            return Err(sea_orm::DbErr::Custom("invalid kind".to_owned()));
        }
    }
    Ok(())
}

fn build_default_content(kind: &str, item_id: &str) -> String {
    format!("## {}\n\n<!-- {} -->\n", kind, item_id)
}

pub async fn list_work_items(
    db: &DatabaseConnection,
    query: WorkItemListQuery,
) -> Result<WorkItemListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let (items, total) = repositories::work_item::list_work_items(
        db,
        repositories::work_item::WorkItemListQuery {
            page,
            page_size,
            kind: query.kind,
            parent_id: query.parent_id,
            keyword: query.keyword,
            status: query.status,
            priority: query.priority,
            sort_field: query.sort_field,
            sort_order: query.sort_order,
        },
    )
    .await?;

    let mut ids_by_child_kind: std::collections::HashMap<String, Vec<i32>> = std::collections::HashMap::new();
    for item in &items {
        let child_kind = match item.kind.as_str() {
            "project" => Some("requirement"),
            "requirement" => Some("task"),
            "task" => Some("subtask"),
            _ => None,
        };
        if let Some(ck) = child_kind {
            ids_by_child_kind
                .entry(ck.to_owned())
                .or_default()
                .push(item.id);
        }
    }
    let mut parents_with_children: std::collections::HashSet<i32> = std::collections::HashSet::new();
    for (child_kind, parent_ids) in ids_by_child_kind {
        let rows = repositories::work_item::list_parent_ids_with_children(db, child_kind.as_str(), parent_ids).await?;
        for pid in rows {
            parents_with_children.insert(pid);
        }
    }

    Ok(WorkItemListResult {
        items: items
            .into_iter()
            .map(|m| WorkItemDto {
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
            })
            .collect(),
        total,
        page,
        page_size,
    })
}

pub async fn create_work_item(
    db: &DatabaseConnection,
    payload: CreateWorkItemPayload,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    let kind = normalize_kind(payload.kind.as_str());
    let parent_kind = match payload.parent_id {
        Some(pid) => repositories::work_item::get_parent_kind(db, pid).await?,
        None => None,
    };
    validate_parent_rule(&kind, payload.parent_id, parent_kind)?;
    let ts = now_ts();
    let prefix = match kind.as_str() {
        "project" => "PROJ",
        "requirement" => "REQ",
        "task" => "TASK",
        "subtask" => "SUB",
        _ => "ITEM",
    };
    let item_id = format!("{prefix}-{ts}");
    let content = payload
        .content
        .map(|v| v.trim().to_owned())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| build_default_content(&kind, &item_id));
    let model = repositories::work_item::create_work_item(
        db,
        repositories::work_item::WorkItemCreateInput {
            item_id,
            kind,
            parent_id: payload.parent_id,
            title: trim_or_default(payload.title, "未命名工作项"),
            status: trim_or_default(payload.status, "new"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            content,
            effort: payload.effort,
            plan_month: payload.plan_month.map(|v| v.trim().to_owned()),
            planned_hours: payload.planned_hours,
            actual_hours: payload.actual_hours,
            due_date: payload.due_date.map(|v| v.trim().to_owned()),
            updated_at: ts,
            created_at: ts,
        },
    )
    .await?;
    Ok(WorkItemDto {
        has_children: false,
        id: model.id,
        item_id: model.item_id,
        kind: model.kind,
        parent_id: model.parent_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        content: model.content,
        effort: model.effort,
        plan_month: model.plan_month,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        updated_at: model.updated_at,
    })
}

pub async fn update_work_item(
    db: &DatabaseConnection,
    payload: UpdateWorkItemPayload,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    let existing = repositories::work_item::get_work_item_by_id(db, payload.id).await?;
    let Some(existing) = existing else {
        return Err(sea_orm::DbErr::Custom("work item not found".to_owned()));
    };
    let parent_kind = match payload.parent_id {
        Some(pid) => repositories::work_item::get_parent_kind(db, pid).await?,
        None => None,
    };
    validate_parent_rule(&existing.kind, payload.parent_id, parent_kind)?;
    let model = repositories::work_item::update_work_item(
        db,
        repositories::work_item::WorkItemUpdateInput {
            id: payload.id,
            parent_id: payload.parent_id,
            title: trim_or_default(payload.title, "未命名工作项"),
            status: trim_or_default(payload.status, "new"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            content: payload.content.map(|v| v.trim().to_owned()),
            effort: payload.effort,
            plan_month: payload.plan_month.map(|v| v.trim().to_owned()),
            planned_hours: payload.planned_hours,
            actual_hours: payload.actual_hours,
            due_date: payload.due_date.map(|v| v.trim().to_owned()),
            updated_at: now_ts(),
        },
    )
    .await?;
    Ok(WorkItemDto {
        has_children: false,
        id: model.id,
        item_id: model.item_id,
        kind: model.kind,
        parent_id: model.parent_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        content: model.content,
        effort: model.effort,
        plan_month: model.plan_month,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        updated_at: model.updated_at,
    })
}

pub async fn delete_work_item(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    repositories::work_item::delete_work_item(db, id).await
}

pub async fn get_work_item_detail(
    db: &DatabaseConnection,
    id: i32,
) -> Result<WorkItemDto, sea_orm::DbErr> {
    let model = repositories::work_item::get_work_item_by_id(db, id).await?;
    let Some(model) = model else {
        return Err(sea_orm::DbErr::Custom("work item not found".to_owned()));
    };
    Ok(WorkItemDto {
        has_children: false,
        id: model.id,
        item_id: model.item_id.clone(),
        kind: model.kind.clone(),
        parent_id: model.parent_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        content: if model.content.trim().is_empty() {
            build_default_content(&model.kind, &model.item_id)
        } else {
            model.content
        },
        effort: model.effort,
        plan_month: model.plan_month,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        updated_at: model.updated_at,
    })
}

pub async fn list_parent_projects(
    db: &DatabaseConnection,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    let rows = repositories::work_item::list_by_kind(db, "project").await?;
    Ok(rows
        .into_iter()
        .map(|(id, item_id, title)| WorkItemParentOption { id, item_id, title })
        .collect())
}

pub async fn list_parent_requirements(
    db: &DatabaseConnection,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    let rows = repositories::work_item::list_by_kind(db, "requirement").await?;
    Ok(rows
        .into_iter()
        .map(|(id, item_id, title)| WorkItemParentOption { id, item_id, title })
        .collect())
}

pub async fn list_parent_tasks(
    db: &DatabaseConnection,
) -> Result<Vec<WorkItemParentOption>, sea_orm::DbErr> {
    let rows = repositories::work_item::list_by_kind(db, "task").await?;
    Ok(rows
        .into_iter()
        .map(|(id, item_id, title)| WorkItemParentOption { id, item_id, title })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::DbErr;
    use serde_json::json;

    fn custom_msg(e: DbErr) -> String {
        match e {
            DbErr::Custom(s) => s,
            other => panic!("expected DbErr::Custom, got {other:?}"),
        }
    }

    #[test]
    fn normalize_page_defaults_none_and_zero_to_one() {
        assert_eq!(normalize_page(None), 1);
        assert_eq!(normalize_page(Some(0)), 1);
        assert_eq!(normalize_page(Some(3)), 3);
    }

    #[test]
    fn normalize_page_size_defaults_and_caps_at_100() {
        assert_eq!(normalize_page_size(None), 10);
        assert_eq!(normalize_page_size(Some(0)), 10);
        assert_eq!(normalize_page_size(Some(25)), 25);
        assert_eq!(normalize_page_size(Some(100)), 100);
        assert_eq!(normalize_page_size(Some(500)), 100);
    }

    #[test]
    fn normalize_kind_preserves_known_kinds() {
        for k in ["project", "requirement", "task", "subtask"] {
            assert_eq!(normalize_kind(k), k);
        }
    }

    #[test]
    fn normalize_kind_unknown_falls_back_to_task() {
        assert_eq!(normalize_kind("unknown"), "task");
        assert_eq!(normalize_kind(""), "task");
    }

    #[test]
    fn trim_or_default_trims_and_falls_back() {
        assert_eq!(trim_or_default("  x  ".to_owned(), "d"), "x");
        assert_eq!(trim_or_default("".to_owned(), "d"), "d");
        assert_eq!(trim_or_default("   ".to_owned(), "d"), "d");
    }

    #[test]
    fn build_default_content_includes_kind_and_item_id() {
        let s = build_default_content("requirement", "REQ-1");
        assert!(s.contains("requirement"));
        assert!(s.contains("REQ-1"));
        assert!(s.starts_with("## "));
    }

    #[test]
    fn validate_parent_rule_project_rejects_parent() {
        let e = validate_parent_rule("project", Some(1), None).unwrap_err();
        assert_eq!(custom_msg(e), "project must not have parent");
    }

    #[test]
    fn validate_parent_rule_project_ok_without_parent() {
        validate_parent_rule("project", None, None).unwrap();
    }

    #[test]
    fn validate_parent_rule_requirement_needs_project_parent() {
        let e = validate_parent_rule("requirement", None, None).unwrap_err();
        assert_eq!(custom_msg(e), "requirement must have project parent");

        let e = validate_parent_rule("requirement", Some(1), None).unwrap_err();
        assert_eq!(custom_msg(e), "requirement must have project parent");

        let e = validate_parent_rule("requirement", Some(1), Some("task".to_owned())).unwrap_err();
        assert_eq!(custom_msg(e), "requirement must have project parent");

        validate_parent_rule("requirement", Some(1), Some("project".to_owned())).unwrap();
    }

    #[test]
    fn validate_parent_rule_task_needs_requirement_parent() {
        let e = validate_parent_rule("task", None, None).unwrap_err();
        assert_eq!(custom_msg(e), "task must have requirement parent");

        let e = validate_parent_rule("task", Some(1), Some("project".to_owned())).unwrap_err();
        assert_eq!(custom_msg(e), "task must have requirement parent");

        validate_parent_rule("task", Some(1), Some("requirement".to_owned())).unwrap();
    }

    #[test]
    fn validate_parent_rule_subtask_needs_task_parent() {
        let e = validate_parent_rule("subtask", None, None).unwrap_err();
        assert_eq!(custom_msg(e), "subtask must have task parent");

        let e = validate_parent_rule("subtask", Some(1), Some("requirement".to_owned())).unwrap_err();
        assert_eq!(custom_msg(e), "subtask must have task parent");

        validate_parent_rule("subtask", Some(1), Some("task".to_owned())).unwrap();
    }

    #[test]
    fn validate_parent_rule_invalid_kind() {
        let e = validate_parent_rule("epic", None, None).unwrap_err();
        assert_eq!(custom_msg(e), "invalid kind");
    }

    #[test]
    fn work_item_list_query_deserializes_camel_case_json() {
        let v = json!({
            "page": 2,
            "pageSize": 15,
            "kind": "requirement",
            "parentId": 9,
            "keyword": "k",
            "status": "new",
            "priority": "high",
            "sortField": "updatedAt",
            "sortOrder": "descend"
        });
        let q: WorkItemListQuery = serde_json::from_value(v).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(15));
        assert_eq!(q.kind.as_deref(), Some("requirement"));
        assert_eq!(q.parent_id, Some(9));
        assert_eq!(q.keyword.as_deref(), Some("k"));
        assert_eq!(q.status.as_deref(), Some("new"));
        assert_eq!(q.priority.as_deref(), Some("high"));
        assert_eq!(q.sort_field.as_deref(), Some("updatedAt"));
        assert_eq!(q.sort_order.as_deref(), Some("descend"));
    }

    #[test]
    fn create_work_item_payload_deserializes_camel_case_json() {
        let v = json!({
            "kind": "task",
            "parentId": 3,
            "title": "t",
            "status": "todo",
            "priority": "low",
            "owner": "u",
            "content": "body",
            "effort": 1.5,
            "planMonth": "2026-01",
            "plannedHours": 8.0,
            "actualHours": 2.0,
            "dueDate": "2026-06-01"
        });
        let p: CreateWorkItemPayload = serde_json::from_value(v).unwrap();
        assert_eq!(p.kind, "task");
        assert_eq!(p.parent_id, Some(3));
        assert_eq!(p.title, "t");
        assert_eq!(p.status, "todo");
        assert_eq!(p.priority, "low");
        assert_eq!(p.owner, "u");
        assert_eq!(p.content.as_deref(), Some("body"));
        assert_eq!(p.effort, Some(1.5));
        assert_eq!(p.plan_month.as_deref(), Some("2026-01"));
        assert_eq!(p.planned_hours, Some(8.0));
        assert_eq!(p.actual_hours, Some(2.0));
        assert_eq!(p.due_date.as_deref(), Some("2026-06-01"));
    }

    #[test]
    fn work_item_dto_serializes_camel_case_json() {
        let dto = WorkItemDto {
            id: 1,
            item_id: "TASK-1".to_owned(),
            kind: "task".to_owned(),
            parent_id: Some(2),
            has_children: true,
            title: "Title".to_owned(),
            status: "todo".to_owned(),
            priority: "medium".to_owned(),
            owner: "o".to_owned(),
            content: "".to_owned(),
            effort: None,
            plan_month: None,
            planned_hours: Some(1.0),
            actual_hours: None,
            due_date: None,
            updated_at: 99,
        };
        let v = serde_json::to_value(&dto).unwrap();
        assert_eq!(v["id"], 1);
        assert_eq!(v["itemId"], "TASK-1");
        assert_eq!(v["kind"], "task");
        assert_eq!(v["parentId"], 2);
        assert_eq!(v["hasChildren"], true);
        assert_eq!(v["planMonth"], serde_json::Value::Null);
        assert_eq!(v["updatedAt"], 99);
    }
}
