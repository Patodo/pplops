use sea_orm::{DatabaseConnection, EntityTrait, PaginatorTrait};

use crate::models::member::Entity as MemberEntity;

pub async fn count_members(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    MemberEntity::find().count(db).await
}
