use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "work_item")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
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

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
