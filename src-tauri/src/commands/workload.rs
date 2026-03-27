#[tauri::command]
pub fn workload_ping() -> &'static str {
    "workload"
}
