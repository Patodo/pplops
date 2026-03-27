use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, IntoActiveModel,
    Order, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::models::requirement::{ActiveModel, Column, Entity, Model};

pub struct RequirementListQuery {
    pub page: u64,
    pub page_size: u64,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub owner: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

pub struct RequirementCreateInput {
    pub req_id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub effort: f64,
    pub plan_month: String,
    pub updated_at: i64,
    pub created_at: i64,
}

pub struct RequirementUpdateInput {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub owner: String,
    pub effort: f64,
    pub plan_month: String,
    pub content: Option<String>,
    pub updated_at: i64,
}

fn normalized_page(page: u64) -> u64 {
    if page == 0 {
        1
    } else {
        page
    }
}

fn normalized_page_size(page_size: u64) -> u64 {
    if page_size == 0 {
        10
    } else {
        page_size.min(100)
    }
}

pub async fn list_requirements(
    db: &DatabaseConnection,
    q: RequirementListQuery,
) -> Result<(Vec<Model>, u64), sea_orm::DbErr> {
    let mut query = Entity::find();
    let mut filter = Condition::all();

    if let Some(keyword) = q.keyword.filter(|v| !v.trim().is_empty()) {
        let trimmed = keyword.trim().to_owned();
        filter = filter.add(
            Condition::any()
                .add(Column::Title.contains(&trimmed))
                .add(Column::ReqId.contains(&trimmed)),
        );
    }
    if let Some(status) = q.status.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Status.eq(status.trim().to_owned()));
    }
    if let Some(owner) = q.owner.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Owner.eq(owner.trim().to_owned()));
    }
    query = query.filter(filter);

    let order = match q.sort_order.as_deref() {
        Some("ascend") | Some("asc") => Order::Asc,
        _ => Order::Desc,
    };
    match q.sort_field.as_deref() {
        Some("effort") => {
            query = query.order_by(Column::Effort, order);
        }
        Some("updatedAt") => {
            query = query.order_by(Column::UpdatedAt, order);
        }
        Some("planMonth") => {
            query = query.order_by(Column::PlanMonth, order);
        }
        Some("priority") => {
            query = query.order_by(Column::Priority, order);
        }
        _ => {
            query = query.order_by(Column::UpdatedAt, Order::Desc);
        }
    }

    let page = normalized_page(q.page);
    let page_size = normalized_page_size(q.page_size);
    let paginator = query.paginate(db, page_size);
    let total = paginator.num_items().await?;
    let items = paginator.fetch_page(page.saturating_sub(1)).await?;
    Ok((items, total))
}

pub async fn list_owners(db: &DatabaseConnection) -> Result<Vec<String>, sea_orm::DbErr> {
    Entity::find()
        .select_only()
        .column(Column::Owner)
        .distinct()
        .into_tuple::<String>()
        .all(db)
        .await
}

pub async fn create_requirement(
    db: &DatabaseConnection,
    input: RequirementCreateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = ActiveModel {
        req_id: Set(input.req_id),
        title: Set(input.title),
        status: Set(input.status),
        priority: Set(input.priority),
        owner: Set(input.owner),
        effort: Set(input.effort),
        plan_month: Set(input.plan_month),
        updated_at: Set(input.updated_at),
        created_at: Set(input.created_at),
        ..Default::default()
    };
    model.insert(db).await
}

pub async fn update_requirement(
    db: &DatabaseConnection,
    input: RequirementUpdateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = Entity::find_by_id(input.id).one(db).await?;
    let Some(existing) = model else {
        return Err(sea_orm::DbErr::Custom("requirement not found".to_owned()));
    };

    let mut active = existing.into_active_model();
    active.title = Set(input.title);
    active.status = Set(input.status);
    active.priority = Set(input.priority);
    active.owner = Set(input.owner);
    active.effort = Set(input.effort);
    active.plan_month = Set(input.plan_month);
    if let Some(content) = input.content {
        active.content = Set(content);
    }
    active.updated_at = Set(input.updated_at);
    active.update(db).await
}

pub async fn get_requirement_by_id(db: &DatabaseConnection, id: i32) -> Result<Option<Model>, sea_orm::DbErr> {
    Entity::find_by_id(id).one(db).await
}

pub async fn delete_requirement(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    let model = Entity::find_by_id(id).one(db).await?;
    let Some(existing) = model else {
        return Ok(());
    };
    existing.into_active_model().delete(db).await?;
    Ok(())
}
