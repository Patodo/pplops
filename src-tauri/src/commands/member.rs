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

#[tauri::command]
pub async fn list_members(
    state: tauri::State<'_, AppState>,
    query: services::member::MemberListQuery,
) -> Result<services::member::MemberListResult, String> {
    services::member::list_members(&state.db, query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_member_groups(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    services::member::list_member_groups(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_member(
    state: tauri::State<'_, AppState>,
    payload: services::member::CreateMemberPayload,
) -> Result<services::member::MemberDto, String> {
    services::member::create_member(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_member(
    state: tauri::State<'_, AppState>,
    payload: services::member::UpdateMemberPayload,
) -> Result<services::member::MemberDto, String> {
    services::member::update_member(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_member(state: tauri::State<'_, AppState>, id: i32) -> Result<(), String> {
    services::member::delete_member(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_member_detail(
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<services::member::MemberDto, String> {
    services::member::get_member_detail(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}
