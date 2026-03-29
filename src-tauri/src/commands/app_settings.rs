use serde::{Deserialize, Serialize};

use crate::data_access::cache;
use crate::repositories::app_setting;
use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsDto {
    pub memory_cache_mode: bool,
    pub cache_loaded: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppSettingsPayload {
    pub memory_cache_mode: bool,
}

#[tauri::command]
pub async fn get_app_settings(state: tauri::State<'_, AppState>) -> Result<AppSettingsDto, String> {
    let g = state.cache.read().await;
    Ok(AppSettingsDto {
        memory_cache_mode: g.memory_cache_enabled,
        cache_loaded: g.loaded,
    })
}

#[tauri::command]
pub async fn set_app_settings(
    state: tauri::State<'_, AppState>,
    payload: SetAppSettingsPayload,
) -> Result<AppSettingsDto, String> {
    let v = if payload.memory_cache_mode { "true" } else { "false" };
    app_setting::upsert_value(&state.db, app_setting::KEY_MEMORY_CACHE_MODE, v)
        .await
        .map_err(|e| e.to_string())?;

    {
        let mut g = state.cache.write().await;
        g.memory_cache_enabled = payload.memory_cache_mode;
        if !payload.memory_cache_mode {
            g.loaded = false;
            g.work_items.clear();
            g.dependencies.clear();
            g.members.clear();
        }
    }

    if payload.memory_cache_mode {
        cache::hydrate_from_db(&state.db, &state.cache)
            .await
            .map_err(|e| e.to_string())?;
    }

    let g = state.cache.read().await;
    Ok(AppSettingsDto {
        memory_cache_mode: g.memory_cache_enabled,
        cache_loaded: g.loaded,
    })
}

#[tauri::command]
pub async fn refresh_data_cache(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let enabled = {
        let g = state.cache.read().await;
        g.memory_cache_enabled
    };
    if !enabled {
        return Ok(());
    }
    cache::hydrate_from_db(&state.db, &state.cache)
        .await
        .map_err(|e| e.to_string())
}
