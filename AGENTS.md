# AGENTS.md

Contributor / AI agent notes for this repository.

## Package manager

- **Use pnpm only** for Node dependencies (`pnpm install`, `pnpm add`, `pnpm run …`).
- **Cargo** for Rust (`cargo test`, `cargo build` under `pplops/src-tauri/`).

## Common Commands

```bash
pnpm dev                # 开发（完整 Tauri 应用）
pnpm dev:web            # 仅前端（无 Tauri 后端）
pnpm test:run           # 前端单次测试（加路径跑单文件）
cargo test              # Rust 单元测试（在 pplops/src-tauri/ 下）
```

## Architecture

PPLOps — Tauri 2 桌面应用，面向研发团队主管的项目/成员/工时管理工具。工作目录是 monorepo 的 `docs/` 子目录，主代码在 `pplops/`（通过 git worktree 引入）。

### 核心数据模型：单表多态 work_item

`work_item` 表通过 `kind` 字段存储四种实体（project / requirement / task / subtask），通过 `parent_id` 自引用构建层级树。优先级为 i32 数值（0–65535，默认 32768），非 P0-P3 字符串。`work_item_dependency` 有向边表维护同级子项间的依赖关系。

遗留的独立 `requirement` 和 `task` 表仍在 migration 中但已废弃，新代码统一走 work_item。

### 后端分层

```
Tauri commands → data_access（门面）→ services → repositories → SQLite
                      ↕
                 DataCache（可选内存缓存）
```

- **commands 层**不得直接调用 services 或 repositories，必须通过 `data_access` 门面
- **读路径**：cache-first（若 `memory_cache_mode` 开启且已 hydrate），否则降级 DB
- **写路径**：先写 DB，成功后同步更新 DataCache（write-through）
- App 设置存储在 `app_setting` KV 表，控制缓存开关

### 前端结构

- `src/features/<name>/` — 独立功能模块，各导出 `nav.ts` + 页面组件
- `src/shared/work-item/` — work-item types + Tauri invoke 封装（共享内核）
- `src/api/` — 领域适配层（requirement.ts / task.ts 将通用 API 映射为领域接口）
- `src/components/` — 跨 feature 共享 UI（PplopsDataTable、Markdown 编辑器等）
- 导航：各 feature `nav.ts` → `AppLayout` 组合显示，禁止硬编码菜单项

### Feature 边界规则

- feature A **禁止**直接 import feature B 的 store 实现文件；跨域通信用 shared 内核或 props 回调
- 外部消费 feature 只从其 `index.ts` 引入
- 业务状态放所属 feature 内部或 `src/shared/`，全局壳状态（如侧栏折叠）放 `src/stores/appStore.ts`
- 侧栏导航：各 feature `nav.ts` + `src/shared/appNav.ts` / `src/shared/opsNav.ts`（`AppLayout` 仅组合 nav 结果，不直接写死业务菜单项）

### Priority 数值域（0–65535、默认中间值 32768）

- `src/lib/workItemPriority.ts`（与表单、看板创建等共用；改编排网格编码改 feature 内 `priorityGrid.ts`）

### 状态管理（Zustand）

- 全局壳状态（如侧栏折叠）放在 `src/stores/appStore.ts`。
- 业务状态优先放在所属 feature 内部或 `src/shared/` 模块。
- **禁止** feature A 直接 import feature B 的 store 实现文件；如需跨域通信，用 shared 内核或 props 回调。

## Conventions

- Prettier：分号必加，双引号
- TypeScript strict 模式，`noUnusedLocals` + `noUnusedParameters`
- Rust `#[tauri::command]` 入参用 `#[serde(rename_all = "camelCase")]`，前端 invoke 自动 camelCase
- Status / kind / owner 等枚举值存为字符串，应用层校验

## OpenSpec

项目使用 OpenSpec 管理变更，spec 存放在 `openspec/specs/`。已建立的 capability spec：
`work-item`、`member`、`data-access-facade`、`app-settings`、`app-shell`、`shared-ui`

新增功能前先用 `/opsx:explore` 探索，再用 `/opsx:propose` 提案。Spec 场景必须用 `####` + WHEN/THEN 格式。
