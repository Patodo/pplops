//! 集中列出 `generate_handler!` 中的命令符号，按**函数名字母序**排列，减少合并冲突。
//! Tauri 2 多次 `.invoke_handler()` 会覆盖而非合并；`generate_handler!` 内不能嵌套子宏展开列表，故整表包在本宏中。
//! 新增命令：在对应业务 `commands/*.rs` 实现后，将 `crate::commands::fn_name` 按字母序插入下方。

#[macro_export]
macro_rules! pplops_invoke_handlers {
    () => {
        tauri::generate_handler![
        crate::commands::create_member,
        crate::commands::create_requirement,
        crate::commands::create_task,
        crate::commands::create_work_item,
        crate::commands::delete_member,
        crate::commands::delete_requirement,
        crate::commands::delete_task,
        crate::commands::delete_work_item,
        crate::commands::get_app_info,
        crate::commands::get_app_settings,
        crate::commands::get_member_detail,
        crate::commands::get_requirement_detail,
        crate::commands::get_task_detail,
        crate::commands::get_work_item_detail,
        crate::commands::get_work_item_orchestration,
        crate::commands::list_member_groups,
        crate::commands::list_members,
        crate::commands::list_parent_projects,
        crate::commands::list_parent_requirements,
        crate::commands::list_parent_tasks,
        crate::commands::list_requirement_owners,
        crate::commands::list_requirements,
        crate::commands::list_task_requirements,
        crate::commands::list_tasks,
        crate::commands::list_work_items,
        crate::commands::member_count,
        crate::commands::member_ping,
        crate::commands::meeting_ping,
        crate::commands::planning_ping,
        crate::commands::refresh_data_cache,
        crate::commands::report_ping,
        crate::commands::requirement_ping,
        crate::commands::save_work_item_orchestration,
        crate::commands::set_app_settings,
        crate::commands::task_ping,
        crate::commands::update_member,
        crate::commands::update_requirement,
        crate::commands::update_task,
        crate::commands::update_work_item,
        crate::commands::workload_ping,
        ]
    };
}
