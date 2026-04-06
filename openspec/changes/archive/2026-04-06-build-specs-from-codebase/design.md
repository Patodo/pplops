## Context

PPLOps 是一个 Tauri 2.x 桌面应用（Rust 后端 + React 前端），用于研发团队主管管理项目进展、成员、任务分配与工时负荷。项目已实现 4 个核心模块（work_item、member、app_settings、data_access_facade），但 planning/workload/meeting/report 仍为 stub。

实际代码架构与 architecture.md 设计存在显著偏差：
- 引入了统一的 `work_item` 单表多态模型，取代了原本独立的设计/任务表
- 增加了 `data_access` 门面层，提供可选的内存缓存读路径
- 前端采用 feature-based 模块化组织（boards/members/planning/work-item-orchestration）
- 遗留的 `requirement` 和 `task` 表仍在 migration 中但逐步被 `work_item` 替代

OpenSpec specs 目录当前为空，需要从代码反推建立 AI 上下文基线。

## Goals / Non-Goals

**Goals:**
- 为 AI 提供准确的 as-built 系统上下文，覆盖 6 个已实现核心模块
- 每个 spec 记录：数据模型、API 接口、业务规则、约束条件
- 标注已知偏差（architecture.md vs 实际代码）和遗留迁移状态
- 使后续新功能开发（planning/workload/meeting）能基于 spec 准确对接现有系统

**Non-Goals:**
- 不替代 architecture.md（宏观设计文档保留其定位）
- 不为 stub 模块创建 spec（planning/workload/meeting/report 等实现时再建）
- 不归档或删除遗留表
- 不修改任何现有代码

## Decisions

### D1: Spec 按 as-built 实现模块组织（方案 B）

**选择：** 按实际代码模块（work-item、member、data-access-facade、app-settings、app-shell、shared-ui）组织 spec

**备选：** 按 architecture.md 的能力域（requirement、planning、member、workload、task、meeting、report）组织

**理由：** AI 开发新功能时需要对接的是实际代码接口，而非设计文档中的理想架构。按实现模块组织 spec 能直接映射到代码路径，减少 AI 的认知跳跃。后续如果需要按能力域查看，可通过 spec 间的交叉引用实现。

### D2: Spec 内容以"接口契约 + 约束规则"为核心

**选择：** 每个 spec 侧重记录：
1. 数据模型（表结构、字段类型、约束）
2. API 接口（Tauri commands 签名、前端 invoke 封装签名）
3. 业务规则（层级约束、状态流转、优先级范围、ID 生成规则）
4. 已知偏差（与 architecture.md 的差异、遗留迁移意图）

**备选：** 以用户故事或功能需求为核心

**理由：** 目标读者是 AI，AI 需要的是精确的接口契约和约束条件，而非人类化的用户故事。以"什么入参、什么出参、什么约束"的方式记录，AI 可以直接在代码生成中引用。

### D3: 6 个 spec 的边界划分

| Spec | 覆盖范围 | 边界依据 |
|---|---|---|
| `work-item` | models/work_item + services/work_item + data_access/work_item + commands/work_item + shared/work-item + api/* + features/boards + features/work-item-orchestration | 单表多态是系统核心，贯穿全栈 |
| `member` | models/member + services/member + data_access/member + commands/member + api/member + features/members | 独立领域，自包含 |
| `data-access-facade` | data_access/mod + data_access/cache + AppState | 缓存门面是横切关注点，独立记录其路由逻辑 |
| `app-settings` | models/app_setting + commands/app_settings + commands/app + api/app + pages/Settings | 轻量但独立的功能模块 |
| `app-shell` | App.tsx + AppLayout + featureRegistry + shared/appNav + shared/opsNav + 各 feature nav.ts | 前端应用骨架，影响所有新功能接入 |
| `shared-ui` | components/ 目录下所有共享组件 | 可复用组件库，新功能开发时直接引用 |

### D4: 遗留表的处理策略

**选择：** 在 work-item spec 中标注遗留表的存在、字段差异和迁移意图，但不为遗留表单独建 spec

**理由：** 遗留表（requirement、task）的数据模型与 work_item 高度重叠，新代码已不直接使用它们。标注但不高频记录，避免给 AI 造成混淆。

## Risks / Trade-offs

- **[Spec 与代码同步] → 后续代码变更时 spec 可能过时**：Mitigation — 每次 `/opsx:apply` 实现新功能后，检查并更新受影响的 spec；在 tasks.md 中加入 spec 更新步骤
- **[6 个 spec 的维护成本] → 数量较多但每个聚焦**：Mitigation — 每个 spec 严格限定在自己的模块边界内，避免内容交叉重复
- **[architecture.md 与 spec 的双源问题] → 设计文档和 spec 可能矛盾**：Mitigation — spec 以 as-built 代码为准，architecture.md 保留为宏观参考；spec 中明确标注偏差
