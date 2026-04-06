## Why

PPLOps 项目已进入中期开发，实际代码演化出了与 architecture.md 不同的架构（统一 work_item 单表多态、data_access 缓存门面、编排依赖图等），但当前 OpenSpec specs 目录为空，AI 缺乏关于 as-built 系统的结构化上下文。在后续开发新功能（planning、workload、meeting 等）之前，需要先从代码反推 spec，为 AI 提供准确的实现基线。

## What Changes

- 新增 6 个 capability spec，每个覆盖一个已实现的核心模块，内容包括：数据模型、API 接口（Tauri commands + 前端 invoke）、业务规则、已知偏差与遗留迁移状态
- 不修改任何现有代码，纯文档产物
- 不建档遗留表（requirement、task），仅在相关 spec 中标注其存在和迁移意图

## Capabilities

### New Capabilities

- `work-item`: 统一工作项模型 — 单表多态（project/requirement/task/subtask）+ 层级规则 + 依赖图 + 编排；覆盖 models/work_item、services/work_item、data_access/work_item、commands/work_item、前端 shared/work-item 及 api/ 适配层、features/boards、features/work-item-orchestration
- `member`: 成员管理 — 独立表 + 缓存读写 + 分组/类型过滤；覆盖 models/member、services/member、data_access/member、commands/member、前端 api/member、features/members
- `data-access-facade`: 数据访问门面 — DataCache 结构、hydrate/sync 机制、读路由（cache-first vs DB fallback）、写穿透同步；覆盖 data_access/ 模块
- `app-settings`: 应用配置 — app_setting KV 表 + 内存缓存开关 + 前端 Settings 页；覆盖 models/app_setting、commands/app_settings、前端 api/app、pages/Settings
- `app-shell`: 应用外壳 — 路由注册、导航配置、布局组件、feature 模块化注册机制；覆盖 App.tsx、AppLayout、featureRegistry、shared/appNav、shared/opsNav、各 feature nav.ts
- `shared-ui`: 共享 UI 组件库 — PplopsDataTable（分页/排序/列定制）、DetailEditModal、Markdown 编辑器、StatusBadge、WorkloadIndicator、PlaceholderPage；覆盖 components/ 目录

### Modified Capabilities

（无现有 capability 需要修改）

## Impact

- 产出 6 个 `specs/<name>/spec.md` 文件，纯文档，不影响代码
- 为后续 planning、workload、meeting 等新功能的开发提供准确的 as-built 上下文基线
- AI 在 `/opsx:apply` 实现新功能时，可通过 spec 理解现有模块的接口契约和约束
