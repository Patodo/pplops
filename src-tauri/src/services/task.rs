use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::repositories;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub requirement_id: Option<i32>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskPayload {
    pub requirement_id: i32,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub due_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskPayload {
    pub id: i32,
    pub requirement_id: i32,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub due_date: String,
    pub content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: i32,
    pub task_id: String,
    pub requirement_id: i32,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub due_date: String,
    pub content: String,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRequirementOption {
    pub id: i32,
    pub req_id: String,
    pub title: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListResult {
    pub items: Vec<TaskDto>,
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

fn build_task_template_content(task_id: &str) -> String {
    format!(
        r#"## 任务描述

### 验收标准
- [ ] 

## 状态流转时间线
| 日期 | 状态 | 变更说明 | 变更人 |
|------|------|----------|--------|
| YYYY-MM-DD | 待开始 | 任务创建 | 系统 |

## 工时记录
| 日期 | 工作内容 | 计划工时 | 实际工时 | 累计工时 | 备注 |
|------|----------|----------|----------|----------|------|
| MM-DD |  | Xh | Xh | Xh |  |

## 任务分解
### 子任务清单
- [ ] 

### 技术方案

## 关联信息
| 关联类型 | 关联内容 |
|----------|----------|
| **依赖任务** | TASK-[ID] |
| **被依赖任务** | TASK-[ID] |

## 产出物
| 产出物 | 链接/位置 | 状态 |
|--------|----------|------|
| 代码PR |  |  |

## 遇到的问题
| 日期 | 问题描述 | 解决方案 | 状态 |
|------|----------|----------|------|
| MM-DD |  |  | 已解决 |

## 关联BUG
| BUG-ID | 描述 | 严重程度 | 发现日期 | 状态 | 修复人 |
|--------|------|----------|----------|------|--------|
| BUG-YYYYMMDD-XXX |  | P2 | YYYY-MM-DD | 未修复 |  |

## 备注

## 变更记录
| 日期 | 变更内容 | 变更人 | 原因 |
|------|----------|--------|------|
| YYYY-MM-DD | 初始创建 | 系统 | - |

<!-- task: {task_id} -->
"#,
        task_id = task_id
    )
}

pub async fn list_tasks(
    db: &DatabaseConnection,
    query: TaskListQuery,
) -> Result<TaskListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let (items, total) = repositories::task::list_tasks(
        db,
        repositories::task::TaskListQuery {
            page,
            page_size,
            keyword: query.keyword,
            status: query.status,
            priority: query.priority,
            requirement_id: query.requirement_id,
            sort_field: query.sort_field,
            sort_order: query.sort_order,
        },
    )
    .await?;
    Ok(TaskListResult {
        items: items
            .into_iter()
            .map(|item| TaskDto {
                id: item.id,
                task_id: item.task_id,
                requirement_id: item.requirement_id,
                title: item.title,
                status: item.status,
                priority: item.priority,
                owner: item.owner,
                planned_hours: item.planned_hours,
                actual_hours: item.actual_hours,
                due_date: item.due_date,
                content: item.content,
                updated_at: item.updated_at,
            })
            .collect(),
        total,
        page,
        page_size,
    })
}

pub async fn list_task_requirements(
    db: &DatabaseConnection,
) -> Result<Vec<TaskRequirementOption>, sea_orm::DbErr> {
    let rows = repositories::task::list_requirements_for_task(db).await?;
    Ok(rows
        .into_iter()
        .map(|(id, req_id, title)| TaskRequirementOption { id, req_id, title })
        .collect())
}

pub async fn create_task(
    db: &DatabaseConnection,
    payload: CreateTaskPayload,
) -> Result<TaskDto, sea_orm::DbErr> {
    let ts = now_ts();
    let task_id = format!("TASK-{ts}");
    let model = repositories::task::create_task(
        db,
        repositories::task::TaskCreateInput {
            task_id: task_id.clone(),
            requirement_id: payload.requirement_id,
            title: trim_or_default(payload.title, "未命名任务"),
            status: trim_or_default(payload.status, "todo"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            planned_hours: payload.planned_hours,
            actual_hours: payload.actual_hours,
            due_date: trim_or_default(payload.due_date, "2099-12-31"),
            content: build_task_template_content(&task_id),
            updated_at: ts,
            created_at: ts,
        },
    )
    .await?;
    Ok(TaskDto {
        id: model.id,
        task_id: model.task_id,
        requirement_id: model.requirement_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        content: model.content,
        updated_at: model.updated_at,
    })
}

pub async fn update_task(
    db: &DatabaseConnection,
    payload: UpdateTaskPayload,
) -> Result<TaskDto, sea_orm::DbErr> {
    let model = repositories::task::update_task(
        db,
        repositories::task::TaskUpdateInput {
            id: payload.id,
            requirement_id: payload.requirement_id,
            title: trim_or_default(payload.title, "未命名任务"),
            status: trim_or_default(payload.status, "todo"),
            priority: trim_or_default(payload.priority, "medium"),
            owner: trim_or_default(payload.owner, "未分配"),
            planned_hours: payload.planned_hours,
            actual_hours: payload.actual_hours,
            due_date: trim_or_default(payload.due_date, "2099-12-31"),
            content: payload.content.map(|v| v.trim().to_owned()),
            updated_at: now_ts(),
        },
    )
    .await?;
    Ok(TaskDto {
        id: model.id,
        task_id: model.task_id,
        requirement_id: model.requirement_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        content: model.content,
        updated_at: model.updated_at,
    })
}

pub async fn delete_task(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    repositories::task::delete_task(db, id).await
}

pub async fn get_task_detail(db: &DatabaseConnection, id: i32) -> Result<TaskDto, sea_orm::DbErr> {
    let model = repositories::task::get_task_by_id(db, id).await?;
    let Some(model) = model else {
        return Err(sea_orm::DbErr::Custom("task not found".to_owned()));
    };
    let task_id = model.task_id.clone();
    Ok(TaskDto {
        id: model.id,
        task_id: model.task_id,
        requirement_id: model.requirement_id,
        title: model.title,
        status: model.status,
        priority: model.priority,
        owner: model.owner,
        planned_hours: model.planned_hours,
        actual_hours: model.actual_hours,
        due_date: model.due_date,
        content: if model.content.trim().is_empty() {
            build_task_template_content(&task_id)
        } else {
            model.content
        },
        updated_at: model.updated_at,
    })
}
