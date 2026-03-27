#[tauri::command]
pub fn meeting_ping() -> &'static str {
    "meeting"
}
