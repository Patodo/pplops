use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "requirement")]
pub struct Model {
    #[sea_orm(primary_key)]
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
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
