use std::collections::HashMap;

use sea_orm::DatabaseConnection;
use tokio::sync::RwLock;

use crate::models::{member, work_item, work_item_dependency};
use crate::repositories;

#[derive(Debug, Default)]
pub struct DataCache {
    pub memory_cache_enabled: bool,
    pub loaded: bool,
    pub work_items: HashMap<i32, work_item::Model>,
    pub dependencies: Vec<work_item_dependency::Model>,
    pub members: HashMap<i32, member::Model>,
}

impl DataCache {
    pub fn empty() -> Self {
        Self {
            memory_cache_enabled: false,
            loaded: false,
            work_items: HashMap::new(),
            dependencies: Vec::new(),
            members: HashMap::new(),
        }
    }
}

pub async fn hydrate_from_db(db: &DatabaseConnection, cache: &RwLock<DataCache>) -> Result<(), sea_orm::DbErr> {
    let items = repositories::work_item::find_all(db).await?;
    let deps = repositories::work_item_dependency::find_all(db).await?;
    let members = repositories::member::find_all(db).await?;
    let mut g = cache.write().await;
    g.work_items = items.into_iter().map(|m| (m.id, m)).collect();
    g.dependencies = deps;
    g.members = members.into_iter().map(|m| (m.id, m)).collect();
    g.loaded = true;
    Ok(())
}

pub async fn reload_dependencies(db: &DatabaseConnection, cache: &RwLock<DataCache>) -> Result<(), sea_orm::DbErr> {
    let deps = repositories::work_item_dependency::find_all(db).await?;
    let mut g = cache.write().await;
    g.dependencies = deps;
    Ok(())
}

pub async fn cache_ready(cache: &RwLock<DataCache>) -> bool {
    let g = cache.read().await;
    g.memory_cache_enabled && g.loaded
}
