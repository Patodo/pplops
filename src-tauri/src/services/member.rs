use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::repositories;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberListQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub keyword: Option<String>,
    pub group_name: Option<String>,
    pub member_type: Option<String>,
    pub status: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMemberPayload {
    pub name: String,
    pub role: String,
    pub direction: String,
    pub hire_date: String,
    pub work_years: f64,
    pub member_type: String,
    pub group_name: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMemberPayload {
    pub id: i32,
    pub name: String,
    pub role: String,
    pub direction: String,
    pub hire_date: String,
    pub work_years: f64,
    pub member_type: String,
    pub group_name: String,
    pub status: String,
    pub content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberDto {
    pub id: i32,
    pub member_id: String,
    pub name: String,
    pub role: String,
    pub direction: String,
    pub hire_date: String,
    pub work_years: f64,
    pub member_type: String,
    pub group_name: String,
    pub status: String,
    pub content: String,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberListResult {
    pub items: Vec<MemberDto>,
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

fn build_member_template_content() -> String {
    r#"## 专业能力
### 核心技能
| 技能类别 | 技能项目 | 熟练程度(1-5) | 最后使用时间 |
|----------|----------|---------------|--------------|
| PCB算法 | 自动布局算法 | [1-5] | YYYY-MM-DD |
| PCB算法 | 自动布线算法 | [1-5] | YYYY-MM-DD |
| 智能开发 | 大模型集成 | [1-5] | YYYY-MM-DD |
| 编程语言 | Python | [1-5] | YYYY-MM-DD |

### 领域知识
- [PCB设计流程与标准]
- [信号完整性原理]

## 发展目标
### 短期目标 (本季度)
| 目标类型 | 目标内容 | 预期完成时间 | 当前进展 |
|----------|----------|--------------|----------|
| 技能提升 |  | YYYY-MM-DD | 🔄进行中 |

### 长期目标 (年度)
1. 
2. 
3. 

## 项目参与
### 当前参与的需求
| 需求ID | 需求标题 | 角色 | 参与阶段 | 贡献度 |
|--------|----------|------|----------|--------|
| [REQ-XXX] | [需求标题] | [负责人/参与者] | [设计/开发/测试] | [高/中/低] |

### 历史项目贡献
| 时间段 | 项目/需求 | 主要贡献 | 成果 |
|--------|-----------|----------|------|
| YYYY-MM | [项目名称] | [具体贡献] | [可量化成果] |

## 工作偏好与限制
### 偏好领域
- 

### 限制与约束
- 

## 发展计划
### 下一步发展重点
1. 
2. 
3. 

### 所需支持
- 
"#
    .to_owned()
}

pub async fn member_count(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    repositories::member::count_members(db).await
}

pub async fn list_members(
    db: &DatabaseConnection,
    query: MemberListQuery,
) -> Result<MemberListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let (items, total) = repositories::member::list_members(
        db,
        repositories::member::MemberListQuery {
            page,
            page_size,
            keyword: query.keyword,
            group_name: query.group_name,
            member_type: query.member_type,
            status: query.status,
            sort_field: query.sort_field,
            sort_order: query.sort_order,
        },
    )
    .await?;
    Ok(MemberListResult {
        items: items
            .into_iter()
            .map(|item| MemberDto {
                id: item.id,
                member_id: item.member_id,
                name: item.name,
                role: item.role,
                direction: item.direction,
                hire_date: item.hire_date,
                work_years: item.work_years,
                member_type: item.member_type,
                group_name: item.group_name,
                status: item.status,
                content: item.content,
                updated_at: item.updated_at,
            })
            .collect(),
        total,
        page,
        page_size,
    })
}

pub async fn list_member_groups(db: &DatabaseConnection) -> Result<Vec<String>, sea_orm::DbErr> {
    let mut groups = repositories::member::list_groups(db).await?;
    groups.sort();
    groups.dedup();
    Ok(groups)
}

pub async fn create_member(
    db: &DatabaseConnection,
    payload: CreateMemberPayload,
) -> Result<MemberDto, sea_orm::DbErr> {
    let ts = now_ts();
    let model = repositories::member::create_member(
        db,
        repositories::member::MemberCreateInput {
            member_id: format!("MEM-{ts}"),
            name: trim_or_default(payload.name, "未命名成员"),
            role: trim_or_default(payload.role, "开发"),
            direction: trim_or_default(payload.direction, "全栈"),
            hire_date: trim_or_default(payload.hire_date, "1970-01-01"),
            work_years: payload.work_years,
            member_type: trim_or_default(payload.member_type, "employee"),
            group_name: trim_or_default(payload.group_name, "未分组"),
            status: trim_or_default(payload.status, "active"),
            content: build_member_template_content(),
            updated_at: ts,
            created_at: ts,
        },
    )
    .await?;
    Ok(MemberDto {
        id: model.id,
        member_id: model.member_id,
        name: model.name,
        role: model.role,
        direction: model.direction,
        hire_date: model.hire_date,
        work_years: model.work_years,
        member_type: model.member_type,
        group_name: model.group_name,
        status: model.status,
        content: model.content,
        updated_at: model.updated_at,
    })
}

pub async fn update_member(
    db: &DatabaseConnection,
    payload: UpdateMemberPayload,
) -> Result<MemberDto, sea_orm::DbErr> {
    let model = repositories::member::update_member(
        db,
        repositories::member::MemberUpdateInput {
            id: payload.id,
            name: trim_or_default(payload.name, "未命名成员"),
            role: trim_or_default(payload.role, "开发"),
            direction: trim_or_default(payload.direction, "全栈"),
            hire_date: trim_or_default(payload.hire_date, "1970-01-01"),
            work_years: payload.work_years,
            member_type: trim_or_default(payload.member_type, "employee"),
            group_name: trim_or_default(payload.group_name, "未分组"),
            status: trim_or_default(payload.status, "active"),
            content: payload.content.map(|v| v.trim().to_owned()),
            updated_at: now_ts(),
        },
    )
    .await?;
    Ok(MemberDto {
        id: model.id,
        member_id: model.member_id,
        name: model.name,
        role: model.role,
        direction: model.direction,
        hire_date: model.hire_date,
        work_years: model.work_years,
        member_type: model.member_type,
        group_name: model.group_name,
        status: model.status,
        content: model.content,
        updated_at: model.updated_at,
    })
}

pub async fn delete_member(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    repositories::member::delete_member(db, id).await
}

pub async fn get_member_detail(db: &DatabaseConnection, id: i32) -> Result<MemberDto, sea_orm::DbErr> {
    let model = repositories::member::get_member_by_id(db, id).await?;
    let Some(model) = model else {
        return Err(sea_orm::DbErr::Custom("member not found".to_owned()));
    };
    Ok(MemberDto {
        id: model.id,
        member_id: model.member_id,
        name: model.name,
        role: model.role,
        direction: model.direction,
        hire_date: model.hire_date,
        work_years: model.work_years,
        member_type: model.member_type,
        group_name: model.group_name,
        status: model.status,
        content: if model.content.trim().is_empty() {
            build_member_template_content()
        } else {
            model.content
        },
        updated_at: model.updated_at,
    })
}
