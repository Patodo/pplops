#![cfg_attr(mobile, tauri::mobile_entry_point)]

mod commands;
mod error;
mod migration;
mod models;
mod repositories;
mod services;
mod state;

use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use tauri::Manager;

pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let db = tauri::async_runtime::block_on(connect_db(&handle))
                .map_err(|e| format!("database init failed: {e}"))?;
            app.manage(state::AppState { db });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::requirement_ping,
            commands::list_requirements,
            commands::list_requirement_owners,
            commands::create_requirement,
            commands::update_requirement,
            commands::delete_requirement,
            commands::get_requirement_detail,
            commands::planning_ping,
            commands::member_ping,
            commands::member_count,
            commands::list_members,
            commands::list_member_groups,
            commands::create_member,
            commands::update_member,
            commands::delete_member,
            commands::get_member_detail,
            commands::workload_ping,
            commands::task_ping,
            commands::list_tasks,
            commands::list_task_requirements,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_task_detail,
            commands::list_work_items,
            commands::get_work_item_detail,
            commands::create_work_item,
            commands::update_work_item,
            commands::delete_work_item,
            commands::list_parent_projects,
            commands::list_parent_requirements,
            commands::list_parent_tasks,
            commands::meeting_ping,
            commands::report_ping,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn connect_db(app: &tauri::AppHandle) -> Result<sea_orm::DatabaseConnection, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let data_dir = app_dir.join("data");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let db_path = data_dir.join("pplops.db");
    let url = sqlite_connection_url(&db_path);
    let db = Database::connect(&url)
        .await
        .map_err(|e| format!("connect: {e}"))?;
    migration::Migrator::up(&db, None)
        .await
        .map_err(|e| format!("migrate: {e}"))?;
    Ok(db)
}

fn sqlite_connection_url(path: &std::path::Path) -> String {
    let normalized = path.to_string_lossy().replace('\\', "/");
    format!("sqlite:///{}?mode=rwc", normalized)
}
