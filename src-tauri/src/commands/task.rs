use crate::services;
use crate::state::AppState;

#[tauri::command]
pub fn task_ping() -> &'static str {
    "task"
}

#[tauri::command]
pub async fn list_tasks(
    state: tauri::State<'_, AppState>,
    query: services::task::TaskListQuery,
) -> Result<services::task::TaskListResult, String> {
    services::task::list_tasks(&state.db, query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_task_requirements(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<services::task::TaskRequirementOption>, String> {
    services::task::list_task_requirements(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_task(
    state: tauri::State<'_, AppState>,
    payload: services::task::CreateTaskPayload,
) -> Result<services::task::TaskDto, String> {
    services::task::create_task(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task(
    state: tauri::State<'_, AppState>,
    payload: services::task::UpdateTaskPayload,
) -> Result<services::task::TaskDto, String> {
    services::task::update_task(&state.db, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task(state: tauri::State<'_, AppState>, id: i32) -> Result<(), String> {
    services::task::delete_task(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_detail(
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<services::task::TaskDto, String> {
    services::task::get_task_detail(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}
