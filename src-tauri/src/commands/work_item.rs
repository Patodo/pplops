use crate::data_access::work_item;
use crate::services;
use crate::state::AppState;

#[tauri::command]
pub async fn list_work_items(
    state: tauri::State<'_, AppState>,
    query: services::work_item::WorkItemListQuery,
) -> Result<services::work_item::WorkItemListResult, String> {
    work_item::list_work_items(&state.db, &state.cache, query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_work_item_detail(
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<services::work_item::WorkItemDto, String> {
    work_item::get_work_item_detail(&state.db, &state.cache, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_work_item(
    state: tauri::State<'_, AppState>,
    payload: services::work_item::CreateWorkItemPayload,
) -> Result<services::work_item::WorkItemDto, String> {
    work_item::create_work_item(&state.db, &state.cache, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_work_item(
    state: tauri::State<'_, AppState>,
    payload: services::work_item::UpdateWorkItemPayload,
) -> Result<services::work_item::WorkItemDto, String> {
    work_item::update_work_item(&state.db, &state.cache, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_work_item(state: tauri::State<'_, AppState>, id: i32) -> Result<(), String> {
    work_item::delete_work_item(&state.db, &state.cache, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_parent_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<services::work_item::WorkItemParentOption>, String> {
    work_item::list_parent_projects(&state.db, &state.cache)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_parent_requirements(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<services::work_item::WorkItemParentOption>, String> {
    work_item::list_parent_requirements(&state.db, &state.cache)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_parent_tasks(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<services::work_item::WorkItemParentOption>, String> {
    work_item::list_parent_tasks(&state.db, &state.cache)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_work_item_orchestration(
    state: tauri::State<'_, AppState>,
    parent_id: i32,
) -> Result<services::work_item::WorkItemOrchestrationDto, String> {
    work_item::get_work_item_orchestration(&state.db, &state.cache, parent_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_work_item_orchestration(
    state: tauri::State<'_, AppState>,
    payload: services::work_item::SaveWorkItemOrchestrationPayload,
) -> Result<(), String> {
    work_item::save_work_item_orchestration(&state.db, &state.cache, payload)
        .await
        .map_err(|e| e.to_string())
}
