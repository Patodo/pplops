#[tauri::command]
pub fn report_ping() -> &'static str {
    "report"
}
