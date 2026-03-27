use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, IntoActiveModel,
    Order, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::models;
use crate::models::task::{ActiveModel, Column, Entity, Model};

pub struct TaskListQuery {
    pub page: u64,
    pub page_size: u64,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub requirement_id: Option<i32>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

pub struct TaskCreateInput {
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
    pub created_at: i64,
}

pub struct TaskUpdateInput {
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
    pub updated_at: i64,
}

pub async fn list_tasks(
    db: &DatabaseConnection,
    q: TaskListQuery,
) -> Result<(Vec<Model>, u64), sea_orm::DbErr> {
    let mut query = Entity::find();
    let mut filter = Condition::all();
    if let Some(keyword) = q.keyword.filter(|v| !v.trim().is_empty()) {
        let trimmed = keyword.trim().to_owned();
        filter = filter.add(
            Condition::any()
                .add(Column::Title.contains(&trimmed))
                .add(Column::TaskId.contains(&trimmed))
                .add(Column::Owner.contains(&trimmed)),
        );
    }
    if let Some(status) = q.status.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Status.eq(status.trim().to_owned()));
    }
    if let Some(priority) = q.priority.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Priority.eq(priority.trim().to_owned()));
    }
    if let Some(requirement_id) = q.requirement_id {
        filter = filter.add(Column::RequirementId.eq(requirement_id));
    }
    query = query.filter(filter);

    let order = match q.sort_order.as_deref() {
        Some("ascend") | Some("asc") => Order::Asc,
        _ => Order::Desc,
    };
    match q.sort_field.as_deref() {
        Some("plannedHours") => query = query.order_by(Column::PlannedHours, order),
        Some("actualHours") => query = query.order_by(Column::ActualHours, order),
        Some("dueDate") => query = query.order_by(Column::DueDate, order),
        Some("updatedAt") => query = query.order_by(Column::UpdatedAt, order),
        _ => query = query.order_by(Column::UpdatedAt, Order::Desc),
    }

    let page = if q.page == 0 { 1 } else { q.page };
    let page_size = if q.page_size == 0 { 10 } else { q.page_size.min(100) };
    let paginator = query.paginate(db, page_size);
    let total = paginator.num_items().await?;
    let items = paginator.fetch_page(page.saturating_sub(1)).await?;
    Ok((items, total))
}

pub async fn create_task(db: &DatabaseConnection, input: TaskCreateInput) -> Result<Model, sea_orm::DbErr> {
    let model = ActiveModel {
        task_id: Set(input.task_id),
        requirement_id: Set(input.requirement_id),
        title: Set(input.title),
        status: Set(input.status),
        priority: Set(input.priority),
        owner: Set(input.owner),
        planned_hours: Set(input.planned_hours),
        actual_hours: Set(input.actual_hours),
        due_date: Set(input.due_date),
        content: Set(input.content),
        updated_at: Set(input.updated_at),
        created_at: Set(input.created_at),
        ..Default::default()
    };
    model.insert(db).await
}

pub async fn update_task(db: &DatabaseConnection, input: TaskUpdateInput) -> Result<Model, sea_orm::DbErr> {
    let model = Entity::find_by_id(input.id).one(db).await?;
    let Some(existing) = model else {
        return Err(sea_orm::DbErr::Custom("task not found".to_owned()));
    };
    let mut active = existing.into_active_model();
    active.requirement_id = Set(input.requirement_id);
    active.title = Set(input.title);
    active.status = Set(input.status);
    active.priority = Set(input.priority);
    active.owner = Set(input.owner);
    active.planned_hours = Set(input.planned_hours);
    active.actual_hours = Set(input.actual_hours);
    active.due_date = Set(input.due_date);
    if let Some(content) = input.content {
        active.content = Set(content);
    }
    active.updated_at = Set(input.updated_at);
    active.update(db).await
}

pub async fn delete_task(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    let model = Entity::find_by_id(id).one(db).await?;
    let Some(existing) = model else {
        return Ok(());
    };
    existing.into_active_model().delete(db).await?;
    Ok(())
}

pub async fn get_task_by_id(db: &DatabaseConnection, id: i32) -> Result<Option<Model>, sea_orm::DbErr> {
    Entity::find_by_id(id).one(db).await
}

pub async fn list_requirements_for_task(
    db: &DatabaseConnection,
) -> Result<Vec<(i32, String, String)>, sea_orm::DbErr> {
    models::requirement::Entity::find()
        .select_only()
        .column(models::requirement::Column::Id)
        .column(models::requirement::Column::ReqId)
        .column(models::requirement::Column::Title)
        .order_by(models::requirement::Column::UpdatedAt, Order::Desc)
        .into_tuple::<(i32, String, String)>()
        .all(db)
        .await
}
