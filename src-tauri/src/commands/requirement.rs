use crate::services;
use crate::state::AppState;

#[tauri::command]
pub fn requirement_ping() -> &'static str {
    "requirement"
}

#[tauri::command]
pub async fn list_requirements(
    state: tauri::State<'_, AppState>,
    query: services::requirement::RequirementListQuery,
) -> Result<services::requirement::RequirementListResult, String> {
    services::requirement::list_requirements(&state.db, query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_requirement_owners(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    services::requirement::list_requirement_owners(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_requirement(
    state: tauri::State<'_, AppState>,
    payload: services::requirement::CreateRequirementPayload,
) -> Result<services::requirement::RequirementDto, String> {
    services::requirement::create_requirement(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_requirement(
    state: tauri::State<'_, AppState>,
    payload: services::requirement::UpdateRequirementPayload,
) -> Result<services::requirement::RequirementDto, String> {
    services::requirement::update_requirement(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_requirement(state: tauri::State<'_, AppState>, id: i32) -> Result<(), String> {
    services::requirement::delete_requirement(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_requirement_detail(
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<services::requirement::RequirementDto, String> {
    services::requirement::get_requirement_detail(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}
