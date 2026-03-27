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
    Ok(WorkItemListResult {
        items: items
            .into_iter()
            .map(|m| WorkItemDto {
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
