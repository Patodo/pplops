use crate::services;
use crate::state::AppState;

#[tauri::command]
pub fn member_ping() -> &'static str {
    "member"
}

#[tauri::command]
pub async fn member_count(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    services::member::member_count(&state.db)
        .await
        .map_err(|e| e.to_string())
}
