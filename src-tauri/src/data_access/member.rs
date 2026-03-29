use sea_orm::DatabaseConnection;
use tokio::sync::RwLock;

use crate::data_access::cache::{self, DataCache};
use crate::models::member::Model as MemModel;
use crate::repositories;
use crate::services::member::{
    self, CreateMemberPayload, MemberDto, MemberListQuery, MemberListResult, UpdateMemberPayload,
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

fn keyword_match(m: &MemModel, keyword: &str) -> bool {
    let t = keyword.trim();
    if t.is_empty() {
        return true;
    }
    let tl = t.to_lowercase();
    m.name.to_lowercase().contains(&tl)
        || m.member_id.to_lowercase().contains(&tl)
        || m.role.to_lowercase().contains(&tl)
}

fn filter_members(models: &[MemModel], q: &repositories::member::MemberListQuery) -> Vec<MemModel> {
    models
        .iter()
        .cloned()
        .filter(|m| {
            if let Some(ref kw) = q.keyword {
                if !keyword_match(m, kw) {
                    return false;
                }
            }
            if let Some(ref g) = q.group_name {
                if !g.trim().is_empty() && m.group_name != g.trim() {
                    return false;
                }
            }
            if let Some(ref mt) = q.member_type {
                if !mt.trim().is_empty() && m.member_type != mt.trim() {
                    return false;
                }
            }
            if let Some(ref st) = q.status {
                if !st.trim().is_empty() && m.status != st.trim() {
                    return false;
                }
            }
            true
        })
        .collect()
}

fn sort_members(v: &mut [MemModel], q: &repositories::member::MemberListQuery) {
    let asc = matches!(q.sort_order.as_deref(), Some("ascend") | Some("asc"));
    match q.sort_field.as_deref() {
        Some("name") => {
            if asc {
                v.sort_by(|a, b| a.name.cmp(&b.name).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.name.cmp(&a.name).then_with(|| a.id.cmp(&b.id)));
            }
        }
        Some("workYears") => {
            if asc {
                v.sort_by(|a, b| a.work_years.total_cmp(&b.work_years).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.work_years.total_cmp(&a.work_years).then_with(|| a.id.cmp(&b.id)));
            }
        }
        Some("updatedAt") => {
            if asc {
                v.sort_by(|a, b| a.updated_at.cmp(&b.updated_at).then_with(|| a.id.cmp(&b.id)));
            } else {
                v.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then_with(|| a.id.cmp(&b.id)));
            }
        }
        _ => {
            v.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then_with(|| a.id.cmp(&b.id)));
        }
    }
}

fn to_member_dto(m: MemModel) -> MemberDto {
    MemberDto {
        id: m.id,
        member_id: m.member_id,
        name: m.name,
        role: m.role,
        direction: m.direction,
        hire_date: m.hire_date,
        work_years: m.work_years,
        member_type: m.member_type,
        group_name: m.group_name,
        status: m.status,
        content: m.content,
        updated_at: m.updated_at,
    }
}

async fn list_members_from_cache(
    cache: &RwLock<DataCache>,
    query: MemberListQuery,
) -> Result<MemberListResult, sea_orm::DbErr> {
    let page = normalize_page(query.page);
    let page_size = normalize_page_size(query.page_size);
    let g = cache.read().await;
    let all: Vec<MemModel> = g.members.values().cloned().collect();
    let repo_q = repositories::member::MemberListQuery {
        page,
        page_size,
        keyword: query.keyword,
        group_name: query.group_name,
        member_type: query.member_type,
        status: query.status,
        sort_field: query.sort_field,
        sort_order: query.sort_order,
    };
    drop(g);

    let mut filtered = filter_members(&all, &repo_q);
    sort_members(&mut filtered, &repo_q);
    let total = filtered.len() as u64;
    let start = (page.saturating_sub(1)) * page_size;
    let page_items: Vec<MemModel> = filtered
        .into_iter()
        .skip(start as usize)
        .take(page_size as usize)
        .collect();

    Ok(MemberListResult {
        items: page_items.into_iter().map(to_member_dto).collect(),
        total,
        page,
        page_size,
    })
}

pub async fn member_count(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
) -> Result<u64, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        return Ok(g.members.len() as u64);
    }
    member::member_count(db).await
}

pub async fn list_members(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    query: MemberListQuery,
) -> Result<MemberListResult, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        list_members_from_cache(cache, query).await
    } else {
        member::list_members(db, query).await
    }
}

pub async fn list_member_groups(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
) -> Result<Vec<String>, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let mut groups: Vec<String> = g
            .members
            .values()
            .map(|m| m.group_name.clone())
            .collect();
        groups.sort();
        groups.dedup();
        return Ok(groups);
    }
    member::list_member_groups(db).await
}

async fn sync_member_row(db: &DatabaseConnection, cache: &RwLock<DataCache>, id: i32) {
    if let Ok(Some(m)) = repositories::member::get_member_by_id(db, id).await {
        let mut g = cache.write().await;
        g.members.insert(id, m);
    }
}

pub async fn create_member(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    payload: CreateMemberPayload,
) -> Result<MemberDto, sea_orm::DbErr> {
    let dto = member::create_member(db, payload).await?;
    if cache::cache_ready(cache).await {
        sync_member_row(db, cache, dto.id).await;
    }
    Ok(dto)
}

pub async fn update_member(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    payload: UpdateMemberPayload,
) -> Result<MemberDto, sea_orm::DbErr> {
    let dto = member::update_member(db, payload).await?;
    if cache::cache_ready(cache).await {
        sync_member_row(db, cache, dto.id).await;
    }
    Ok(dto)
}

pub async fn delete_member(db: &DatabaseConnection, cache: &RwLock<DataCache>, id: i32) -> Result<(), sea_orm::DbErr> {
    member::delete_member(db, id).await?;
    if cache::cache_ready(cache).await {
        let mut g = cache.write().await;
        g.members.remove(&id);
    }
    Ok(())
}

pub async fn get_member_detail(
    db: &DatabaseConnection,
    cache: &RwLock<DataCache>,
    id: i32,
) -> Result<MemberDto, sea_orm::DbErr> {
    if cache::cache_ready(cache).await {
        let g = cache.read().await;
        let Some(model) = g.members.get(&id).cloned() else {
            return Err(sea_orm::DbErr::Custom("member not found".to_owned()));
        };
        let content = if model.content.trim().is_empty() {
            member::build_member_template_content()
        } else {
            model.content
        };
        return Ok(MemberDto {
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
            content,
            updated_at: model.updated_at,
        });
    }
    member::get_member_detail(db, id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::member::MemberListQuery as RepoQ;

    fn mem(
        id: i32,
        name: &str,
        member_id: &str,
        role: &str,
        group: &str,
        member_type: &str,
        status: &str,
        updated_at: i64,
        work_years: f64,
    ) -> MemModel {
        MemModel {
            id,
            name: name.to_string(),
            member_id: member_id.to_string(),
            role: role.to_string(),
            direction: "fe".to_string(),
            hire_date: "2020-01-01".to_string(),
            work_years,
            member_type: member_type.to_string(),
            group_name: group.to_string(),
            status: status.to_string(),
            content: String::new(),
            updated_at,
            created_at: 0,
        }
    }

    #[test]
    fn keyword_match_finds_name_role_member_id_case_insensitive() {
        let m = mem(1, "Zhang San", "MEM-1", "Dev", "g1", "employee", "active", 1, 1.0);
        assert!(keyword_match(&m, "zhang"));
        assert!(keyword_match(&m, "MEM-1"));
        assert!(keyword_match(&m, "dev"));
        assert!(!keyword_match(&m, "missing"));
    }

    #[test]
    fn filter_members_group_and_status() {
        let rows = vec![
            mem(1, "a", "M1", "r", "Alpha", "employee", "active", 1, 1.0),
            mem(2, "b", "M2", "r", "Beta", "outsource", "active", 1, 1.0),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            keyword: None,
            group_name: Some("Alpha".to_string()),
            member_type: None,
            status: Some("active".to_string()),
            sort_field: None,
            sort_order: None,
        };
        let out = filter_members(&rows, &q);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, 1);
    }

    #[test]
    fn sort_members_default_updated_at_desc() {
        let mut rows = vec![
            mem(1, "a", "M1", "r", "g", "e", "active", 10, 1.0),
            mem(2, "b", "M2", "r", "g", "e", "active", 50, 1.0),
        ];
        let q = RepoQ {
            page: 1,
            page_size: 10,
            keyword: None,
            group_name: None,
            member_type: None,
            status: None,
            sort_field: None,
            sort_order: None,
        };
        sort_members(&mut rows, &q);
        assert_eq!(rows[0].id, 2);
        assert_eq!(rows[1].id, 1);
    }

    #[test]
    fn member_pagination_second_page() {
        let rows: Vec<_> = (1..=5)
            .map(|i| {
                mem(
                    i,
                    &format!("n{i}"),
                    &format!("M{i}"),
                    "r",
                    "g",
                    "employee",
                    "active",
                    i as i64,
                    1.0,
                )
            })
            .collect();
        let q = RepoQ {
            page: 2,
            page_size: 2,
            keyword: None,
            group_name: None,
            member_type: None,
            status: None,
            sort_field: Some("updatedAt".to_string()),
            sort_order: Some("ascend".to_string()),
        };
        let mut filtered = filter_members(&rows, &q);
        sort_members(&mut filtered, &q);
        let page = normalize_page(Some(2));
        let page_size = normalize_page_size(Some(2));
        let start = (page.saturating_sub(1)) * page_size;
        let page_items: Vec<_> = filtered
            .into_iter()
            .skip(start as usize)
            .take(page_size as usize)
            .collect();
        assert_eq!(page_items.len(), 2);
        assert_eq!(page_items[0].id, 3);
        assert_eq!(page_items[1].id, 4);
    }
}
