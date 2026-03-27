use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "member")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub member_id: String,
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

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
