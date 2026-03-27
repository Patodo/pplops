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
    pub content: Option<String>,
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
    pub content: String,
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

fn date_from_plan_month(plan_month: &str) -> String {
    let trimmed = plan_month.trim();
    if trimmed.len() == 7 && trimmed.chars().nth(4) == Some('-') {
        format!("{trimmed}-01")
    } else {
        "1970-01-01".to_owned()
    }
}

fn build_requirement_template_content(dto: &RequirementDto) -> String {
    let date = date_from_plan_month(&dto.plan_month);
    format!(
        r#"## 概述

## 背景与目标

## 产品现有功能重叠分析
- **重叠功能：**
- **复用可能性：**
- **替代/废弃：**
- **数据迁移：**

## 竞品软件分析
- **竞品列表：**
- **功能对比：**
- **优势借鉴：**
- **差异化定位：**

## 详细描述

#### 功能点清单
1. 

#### 用户场景或使用流程

#### 输入/输出要求
- **输入：**
- **输出：**

#### 界面/交互要求

#### 性能要求

#### 兼容性要求

## 周边依赖

### PCB

### 原理图

## 验收标准
1. 

## 影响范围
- **涉及模块:**
- **相关文档:**
- **依赖项:**
- **风险评估:**

## 外部人力需求

| 角色 | 需求说明 | 预估投入(人天) | 投入阶段 | 申请状态 |
|------|----------|---------------|----------|----------|
| BA |  |  |  | 待申请 |
| UX |  |  |  | 待申请 |
| 测试 |  |  |  | 待申请 |
| 资料 |  |  |  | 待申请 |

## 工作量评估
| 任务项 | 预估工作量(人天) | 负责人 | 备注 |
|--------|----------------|--------|------|
|  |  | {owner} |  |
| **总计** | **{effort}** | | |

## 规划信息
- **计划开始日期:** {date}
- **计划完成日期:** {date}
- **实际开始日期:**
- **实际完成日期:**
- **所属迭代/周期:** {plan_month}

## 关联信息
- **所属项目:** [[PROJ-XXX-项目名称]]
- **关联需求:**
- **关联任务:**
- **关联成员:**
- **相关资源:**

## 历史记录
| 日期 | 更新内容 | 更新人 |
|------|----------|--------|
| {date} | 初始创建 | 系统 |

## 备注
"#,
        date = date,
        owner = dto.owner,
        effort = dto.effort,
        plan_month = dto.plan_month,
    )
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
                content: item.content,
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
        content: model.content,
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
            content: payload
                .content
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty()),
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
        content: model.content,
        updated_at: model.updated_at,
    })
}

pub async fn get_requirement_detail(
    db: &DatabaseConnection,
    id: i32,
) -> Result<RequirementDto, sea_orm::DbErr> {
    let model = repositories::requirement::get_requirement_by_id(db, id).await?;
    let Some(model) = model else {
        return Err(sea_orm::DbErr::Custom("requirement not found".to_owned()));
    };
    let mut dto = RequirementDto {
        id: model.id,
        req_id: model.req_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        effort: model.effort,
        plan_month: model.plan_month,
        content: model.content,
        updated_at: model.updated_at,
    };
    if dto.content.trim().is_empty() {
        dto.content = build_requirement_template_content(&dto);
    }
    Ok(dto)
}

pub async fn delete_requirement(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    repositories::requirement::delete_requirement(db, id).await
}
