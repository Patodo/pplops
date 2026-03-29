#![cfg_attr(mobile, tauri::mobile_entry_point)]

mod commands;
mod data_access;
mod error;
mod migration;
mod models;
mod repositories;
mod services;
mod state;

use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use tauri::menu::{MenuBuilder, MenuEvent};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime, WindowEvent};

pub use error::{AppError, AppResult};

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .text("show_main", "显示主窗口")
        .separator()
        .text("quit", "退出")
        .build()
        .map_err(|e| e.to_string())?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "missing default window icon".to_string())?;

    TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("PPLOps")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event: MenuEvent| {
            if event.id == "quit" {
                app.exit(0);
            } else if event.id == "show_main" {
                show_main_window(app);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            {
                if button == MouseButton::Left && button_state == MouseButtonState::Up {
                    show_main_window(tray.app_handle());
                }
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let db = tauri::async_runtime::block_on(connect_db(&handle))
                .map_err(|e| format!("database init failed: {e}"))?;
            let cache = std::sync::Arc::new(tokio::sync::RwLock::new(
                crate::data_access::DataCache::empty(),
            ));
            tauri::async_runtime::block_on(async {
                let enabled = crate::repositories::app_setting::get_memory_cache_mode(&db)
                    .await
                    .map_err(|e| format!("read app settings: {e}"))?;
                {
                    let mut g = cache.write().await;
                    g.memory_cache_enabled = enabled;
                }
                if enabled {
                    crate::data_access::cache::hydrate_from_db(&db, &cache)
                        .await
                        .map_err(|e| format!("hydrate cache: {e}"))?;
                }
                Ok::<(), String>(())
            })?;
            app.manage(state::AppState { db, cache });
            setup_tray(app.handle())?;
            Ok(())
        })
        // 命令表见 `commands/invoke_list.rs`（按名字排序；Tauri 2 不支持链式 merge invoke_handler）
        .invoke_handler(pplops_invoke_handlers!())
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
