use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::repositories;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequirementListQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub owner: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequirementPayload {
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub effort: f64,
    pub plan_month: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequirementPayload {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub effort: f64,
    pub plan_month: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequirementDto {
    pub id: i32,
    pub req_id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub effort: f64,
    pub plan_month: String,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequirementListResult {
    pub items: Vec<RequirementDto>,
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

pub async fn list_requirements(
    db: &DatabaseConnection,
    query: RequirementListQuery,
) -> Result<RequirementListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let (items, total) = repositories::requirement::list_requirements(
        db,
        repositories::requirement::RequirementListQuery {
            page,
            page_size,
            keyword: query.keyword,
            status: query.status,
            owner: query.owner,
            sort_field: query.sort_field,
            sort_order: query.sort_order,
        },
    )
    .await?;

    Ok(RequirementListResult {
        items: items
            .into_iter()
            .map(|item| RequirementDto {
                id: item.id,
                req_id: item.req_id,
                title: item.title,
                status: item.status,
                priority: item.priority,
                owner: item.owner,
                effort: item.effort,
                plan_month: item.plan_month,
                updated_at: item.updated_at,
            })
            .collect(),
        total,
        page,
        page_size,
    })
}

pub async fn list_requirement_owners(db: &DatabaseConnection) -> Result<Vec<String>, sea_orm::DbErr> {
    let mut owners = repositories::requirement::list_owners(db).await?;
    owners.sort();
    owners.dedup();
    Ok(owners)
}

pub async fn create_requirement(
    db: &DatabaseConnection,
    payload: CreateRequirementPayload,
) -> Result<RequirementDto, sea_orm::DbErr> {
    let ts = now_ts();
    let req_id = format!("REQ-{ts}");
    let model = repositories::requirement::create_requirement(
        db,
        repositories::requirement::RequirementCreateInput {
            req_id,
            title: trim_or_default(payload.title, "未命名需求"),
            status: trim_or_default(payload.status, "new"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            effort: payload.effort,
            plan_month: trim_or_default(payload.plan_month, "2026-01"),
            updated_at: ts,
            created_at: ts,
        },
    )
    .await?;

    Ok(RequirementDto {
        id: model.id,
        req_id: model.req_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        effort: model.effort,
        plan_month: model.plan_month,
        updated_at: model.updated_at,
    })
}

pub async fn update_requirement(
    db: &DatabaseConnection,
    payload: UpdateRequirementPayload,
) -> Result<RequirementDto, sea_orm::DbErr> {
    let model = repositories::requirement::update_requirement(
        db,
        repositories::requirement::RequirementUpdateInput {
            id: payload.id,
            title: trim_or_default(payload.title, "未命名需求"),
            status: trim_or_default(payload.status, "new"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            effort: payload.effort,
            plan_month: trim_or_default(payload.plan_month, "2026-01"),
            updated_at: now_ts(),
        },
    )
    .await?;

    Ok(RequirementDto {
        id: model.id,
        req_id: model.req_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        effort: model.effort,
        plan_month: model.plan_month,
        updated_at: model.updated_at,
    })
}

pub async fn delete_requirement(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    repositories::requirement::delete_requirement(db, id).await
}
