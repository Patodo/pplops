use sea_orm::DatabaseConnection;

use crate::repositories;

pub async fn member_count(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    repositories::member::count_members(db).await
}
