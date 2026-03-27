use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait,
    IntoActiveModel, Order, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::models::work_item::{ActiveModel, Column, Entity, Model};

pub struct WorkItemListQuery {
    pub page: u64,
    pub page_size: u64,
    pub kind: Option<String>,
    pub parent_id: Option<i32>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

pub struct WorkItemCreateInput {
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
    pub created_at: i64,
}

pub struct WorkItemUpdateInput {
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
    pub updated_at: i64,
}

pub async fn list_work_items(
    db: &DatabaseConnection,
    q: WorkItemListQuery,
) -> Result<(Vec<Model>, u64), sea_orm::DbErr> {
    let mut query = Entity::find();
    let mut filter = Condition::all();
    if let Some(kind) = q.kind.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Kind.eq(kind.trim().to_owned()));
    }
    if let Some(parent_id) = q.parent_id {
        filter = filter.add(Column::ParentId.eq(parent_id));
    }
    if let Some(keyword) = q.keyword.filter(|v| !v.trim().is_empty()) {
        let trimmed = keyword.trim().to_owned();
        filter = filter.add(
            Condition::any()
                .add(Column::Title.contains(&trimmed))
                .add(Column::ItemId.contains(&trimmed))
                .add(Column::Owner.contains(&trimmed)),
        );
    }
    if let Some(status) = q.status.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Status.eq(status.trim().to_owned()));
    }
    if let Some(priority) = q.priority.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Priority.eq(priority.trim().to_owned()));
    }
    query = query.filter(filter);

    let order = match q.sort_order.as_deref() {
        Some("ascend") | Some("asc") => Order::Asc,
        _ => Order::Desc,
    };
    match q.sort_field.as_deref() {
        Some("updatedAt") => query = query.order_by(Column::UpdatedAt, order),
        Some("title") => query = query.order_by(Column::Title, order),
        _ => query = query.order_by(Column::UpdatedAt, Order::Desc),
    }

    let page = if q.page == 0 { 1 } else { q.page };
    let page_size = if q.page_size == 0 { 10 } else { q.page_size.min(100) };
    let paginator = query.paginate(db, page_size);
    let total = paginator.num_items().await?;
    let items = paginator.fetch_page(page.saturating_sub(1)).await?;
    Ok((items, total))
}

pub async fn create_work_item(
    db: &DatabaseConnection,
    input: WorkItemCreateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = ActiveModel {
        item_id: Set(input.item_id),
        kind: Set(input.kind),
        parent_id: Set(input.parent_id),
        title: Set(input.title),
        status: Set(input.status),
        priority: Set(input.priority),
        owner: Set(input.owner),
        content: Set(input.content),
        effort: Set(input.effort),
        plan_month: Set(input.plan_month),
        planned_hours: Set(input.planned_hours),
        actual_hours: Set(input.actual_hours),
        due_date: Set(input.due_date),
        updated_at: Set(input.updated_at),
        created_at: Set(input.created_at),
        ..Default::default()
    };
    model.insert(db).await
}

pub async fn update_work_item(
    db: &DatabaseConnection,
    input: WorkItemUpdateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = Entity::find_by_id(input.id).one(db).await?;
    let Some(existing) = model else {
        return Err(sea_orm::DbErr::Custom("work item not found".to_owned()));
    };
    let mut active = existing.into_active_model();
    active.parent_id = Set(input.parent_id);
    active.title = Set(input.title);
    active.status = Set(input.status);
    active.priority = Set(input.priority);
    active.owner = Set(input.owner);
    if let Some(content) = input.content {
        active.content = Set(content);
    }
    active.effort = Set(input.effort);
    active.plan_month = Set(input.plan_month);
    active.planned_hours = Set(input.planned_hours);
    active.actual_hours = Set(input.actual_hours);
    active.due_date = Set(input.due_date);
    active.updated_at = Set(input.updated_at);
    active.update(db).await
}

pub async fn delete_work_item(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    let model = Entity::find_by_id(id).one(db).await?;
    let Some(existing) = model else {
        return Ok(());
    };
    existing.into_active_model().delete(db).await?;
    Ok(())
}

pub async fn get_work_item_by_id(
    db: &DatabaseConnection,
    id: i32,
) -> Result<Option<Model>, sea_orm::DbErr> {
    Entity::find_by_id(id).one(db).await
}

pub async fn get_parent_kind(
    db: &DatabaseConnection,
    parent_id: i32,
) -> Result<Option<String>, sea_orm::DbErr> {
    Entity::find_by_id(parent_id)
        .select_only()
        .column(Column::Kind)
        .into_tuple::<String>()
        .one(db)
        .await
}

pub async fn list_by_kind(
    db: &DatabaseConnection,
    kind: &str,
) -> Result<Vec<(i32, String, String)>, sea_orm::DbErr> {
    Entity::find()
        .filter(Column::Kind.eq(kind.to_owned()))
        .select_only()
        .column(Column::Id)
        .column(Column::ItemId)
        .column(Column::Title)
        .order_by(Column::UpdatedAt, Order::Desc)
        .into_tuple::<(i32, String, String)>()
        .all(db)
        .await
}

pub async fn list_parent_ids_with_children(
    db: &DatabaseConnection,
    child_kind: &str,
    parent_ids: Vec<i32>,
) -> Result<Vec<i32>, sea_orm::DbErr> {
    if parent_ids.is_empty() {
        return Ok(vec![]);
    }
    let rows = Entity::find()
        .filter(Column::Kind.eq(child_kind.to_owned()))
        .filter(Column::ParentId.is_in(parent_ids))
        .select_only()
        .column(Column::ParentId)
        .column_as(Expr::col(Column::Id).count(), "cnt")
        .group_by(Column::ParentId)
        .into_tuple::<(Option<i32>, i64)>()
        .all(db)
        .await?;
    Ok(rows.into_iter().filter_map(|(pid, _)| pid).collect())
}
