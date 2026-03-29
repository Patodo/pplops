use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel, Set};

use crate::models::app_setting::{ActiveModel, Entity};

pub const KEY_MEMORY_CACHE_MODE: &str = "memory_cache_mode";

pub async fn get_value(db: &DatabaseConnection, key: &str) -> Result<Option<String>, sea_orm::DbErr> {
    Entity::find_by_id(key.to_owned())
        .one(db)
        .await
        .map(|m| m.map(|row| row.value))
}

pub async fn upsert_value(db: &DatabaseConnection, key: &str, value: &str) -> Result<(), sea_orm::DbErr> {
    if let Some(existing) = Entity::find_by_id(key.to_owned()).one(db).await? {
        let mut active: ActiveModel = existing.into_active_model();
        active.value = Set(value.to_owned());
        active.update(db).await?;
    } else {
        let m = ActiveModel {
            key: Set(key.to_owned()),
            value: Set(value.to_owned()),
        };
        m.insert(db).await?;
    }
    Ok(())
}

pub async fn get_memory_cache_mode(db: &DatabaseConnection) -> Result<bool, sea_orm::DbErr> {
    Ok(match get_value(db, KEY_MEMORY_CACHE_MODE).await? {
        Some(v) => v == "true" || v == "1",
        None => false,
    })
}
