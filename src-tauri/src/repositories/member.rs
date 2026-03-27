use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, IntoActiveModel,
    Order, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::models::member::{ActiveModel, Column, Entity, Model};

pub struct MemberListQuery {
    pub page: u64,
    pub page_size: u64,
    pub keyword: Option<String>,
    pub group_name: Option<String>,
    pub member_type: Option<String>,
    pub status: Option<String>,
    pub sort_field: Option<String>,
    pub sort_order: Option<String>,
}

pub struct MemberCreateInput {
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
    pub created_at: i64,
}

pub struct MemberUpdateInput {
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
    pub updated_at: i64,
}

pub async fn count_members(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    Entity::find().count(db).await
}

pub async fn list_members(
    db: &DatabaseConnection,
    q: MemberListQuery,
) -> Result<(Vec<Model>, u64), sea_orm::DbErr> {
    let mut query = Entity::find();
    let mut filter = Condition::all();

    if let Some(keyword) = q.keyword.filter(|v| !v.trim().is_empty()) {
        let trimmed = keyword.trim().to_owned();
        filter = filter.add(
            Condition::any()
                .add(Column::Name.contains(&trimmed))
                .add(Column::MemberId.contains(&trimmed))
                .add(Column::Role.contains(&trimmed)),
        );
    }
    if let Some(group_name) = q.group_name.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::GroupName.eq(group_name.trim().to_owned()));
    }
    if let Some(member_type) = q.member_type.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::MemberType.eq(member_type.trim().to_owned()));
    }
    if let Some(status) = q.status.filter(|v| !v.trim().is_empty()) {
        filter = filter.add(Column::Status.eq(status.trim().to_owned()));
    }
    query = query.filter(filter);

    let order = match q.sort_order.as_deref() {
        Some("ascend") | Some("asc") => Order::Asc,
        _ => Order::Desc,
    };
    match q.sort_field.as_deref() {
        Some("name") => query = query.order_by(Column::Name, order),
        Some("workYears") => query = query.order_by(Column::WorkYears, order),
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

pub async fn list_groups(db: &DatabaseConnection) -> Result<Vec<String>, sea_orm::DbErr> {
    Entity::find()
        .select_only()
        .column(Column::GroupName)
        .distinct()
        .into_tuple::<String>()
        .all(db)
        .await
}

pub async fn create_member(
    db: &DatabaseConnection,
    input: MemberCreateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = ActiveModel {
        member_id: Set(input.member_id),
        name: Set(input.name),
        role: Set(input.role),
        direction: Set(input.direction),
        hire_date: Set(input.hire_date),
        work_years: Set(input.work_years),
        member_type: Set(input.member_type),
        group_name: Set(input.group_name),
        status: Set(input.status),
        content: Set(input.content),
        updated_at: Set(input.updated_at),
        created_at: Set(input.created_at),
        ..Default::default()
    };
    model.insert(db).await
}

pub async fn update_member(
    db: &DatabaseConnection,
    input: MemberUpdateInput,
) -> Result<Model, sea_orm::DbErr> {
    let model = Entity::find_by_id(input.id).one(db).await?;
    let Some(existing) = model else {
        return Err(sea_orm::DbErr::Custom("member not found".to_owned()));
    };
    let mut active = existing.into_active_model();
    active.name = Set(input.name);
    active.role = Set(input.role);
    active.direction = Set(input.direction);
    active.hire_date = Set(input.hire_date);
    active.work_years = Set(input.work_years);
    active.member_type = Set(input.member_type);
    active.group_name = Set(input.group_name);
    active.status = Set(input.status);
    if let Some(content) = input.content {
        active.content = Set(content);
    }
    active.updated_at = Set(input.updated_at);
    active.update(db).await
}

pub async fn delete_member(db: &DatabaseConnection, id: i32) -> Result<(), sea_orm::DbErr> {
    let model = Entity::find_by_id(id).one(db).await?;
    let Some(existing) = model else {
        return Ok(());
    };
    existing.into_active_model().delete(db).await?;
    Ok(())
}

pub async fn get_member_by_id(db: &DatabaseConnection, id: i32) -> Result<Option<Model>, sea_orm::DbErr> {
    Entity::find_by_id(id).one(db).await
}
