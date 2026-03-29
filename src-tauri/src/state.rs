use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::sync::RwLock;

use crate::data_access::DataCache;

pub struct AppState {
    pub db: DatabaseConnection,
    pub cache: Arc<RwLock<DataCache>>,
}
