use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "task")]
pub struct Model {
    #[sea_orm(primary_key)]
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
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
