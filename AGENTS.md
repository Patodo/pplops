# Agent / contributor notes

## Package manager

- **Use pnpm only** for Node dependencies (`pnpm install`, `pnpm add`, `pnpm run …`).

## 并行开发边界（前端）

- **编排**：`src/features/work-item-orchestration/`（对外只从 `@/features/work-item-orchestration` 的 `index.ts` 引用）。
- **工作项内核**：`src/shared/work-item/`（types + Tauri invoke 封装；看板、计划、编排等只从 `@/shared/work-item` 引用，`src/api/work-item.ts` / `src/types/work-item.ts` 仅兼容旧路径）。
- **看板**：`src/features/boards/`（页面与 Legacy redirect；入口从 `@/features/boards` 引用；看板专用组件优先收敛到本目录）。
- **成员**：`src/features/members/`（成员列表/详情/技能矩阵页面；入口从 `@/features/members` 引用）。
- **计划**：`src/features/planning/`（计划总览、月/周、甘特页面；入口从 `@/features/planning` 引用）。
- **侧栏导航**：各 feature `nav.ts` + `src/shared/appNav.ts` / `src/shared/opsNav.ts`（`AppLayout` 仅组合 nav 结果，不直接写死业务菜单项）。
- **priority 数值域（0–65535、默认中间值）**：`src/lib/workItemPriority.ts`（与表单、看板创建等共用；改编排网格编码改 feature 内 `priorityGrid.ts`）。
- **状态管理（Zustand）**：
  - 全局壳状态（如侧栏折叠）放在 `src/stores/appStore.ts`。
  - 业务状态优先放在所属 feature 内部或 `src/shared/` 模块。
  - **禁止** feature A 直接 import feature B 的 store 实现文件；如需跨域通信，用 shared 内核或 props 回调。

## 后端（Tauri）

- **数据访问门面**：`src-tauri/src/data_access/`。新增或修改**读路径**时，应经 `data_access` 根据应用设置（如「内存缓存模式」）在 **SQLite（repositories）** 与 **内存快照** 之间路由；避免在 `commands` 或零散位置绕过门面直连 repository，除非有审查认可的例外并注释原因。
- **写路径**：以数据库为权威；`invoke` 写操作成功后，若内存缓存开启且已灌库，应 **同步更新** `DataCache` 中对应实体（或按约定 **失效并重灌**，见 `data_access::cache`）。新增会改表的命令时遵循同一套约定。
- **应用设置**：键值表 `app_setting`（迁移内）；`memory_cache_mode` 与设置页开关一致，由 `get_app_settings` / `set_app_settings` / `refresh_data_cache` 暴露给前端（`src/api/app.ts`）。

