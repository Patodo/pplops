## ADDED Requirements

### Requirement: Work item single-table polymorphic model

系统 SHALL 使用单一 `work_item` 表存储四种实体类型，通过 `kind` 字段区分：
- `"project"` — 顶层项目，无 parent
- `"requirement"` — 需求，parent 为 project
- `"task"` — 任务，parent 为 requirement
- `"subtask"` — 子任务，parent 为 task

字段定义：
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `i32` | PK, auto-increment |
| `item_id` | `String` | 业务标识，自动生成（PROJ-/REQ-/TASK-/SUB- 前缀 + 时间戳） |
| `kind` | `String` | 必填，仅限上述四种值 |
| `parent_id` | `Option<i32>` | project 为 None，其余必填且指向合法父级 |
| `title` | `String` | 必填，创建时自动 trim |
| `status` | `String` | 字符串枚举，应用层校验 |
| `priority` | `i32` | 数值域 0–65535，默认 32768（中间值） |
| `owner` | `String` | 所有者名称（字符串匹配 member.name，无 FK 约束） |
| `content` | `String` | Markdown 正文，创建时按 kind 生成模板 |
| `effort` | `Option<f64>` | 仅 requirement 使用 |
| `plan_month` | `Option<String>` | 仅 requirement 使用，格式 "YYYY-MM" |
| `planned_hours` | `Option<f64>` | 仅 task/subtask 使用 |
| `actual_hours` | `Option<f64>` | 仅 task/subtask 使用 |
| `due_date` | `Option<String>` | 仅 task/subtask 使用 |
| `updated_at` | `i64` | Unix 时间戳 |
| `created_at` | `i64` | Unix 时间戳 |

#### Scenario: Create a requirement under a project
- **WHEN** create_work_item 被调用，kind="requirement"，parent_id 指向一个 kind="project" 的记录
- **THEN** 系统创建记录，自动生成 item_id（"REQ-{timestamp}"），填充 content 为简单模板 `## requirement\n\n<!-- REQ-{ts} -->\n`，effort 和 plan_month 留空

创建默认值：title 空时默认 "未命名工作项"，status 空时默认 "new"，owner 空时默认 "未分配"。priority 默认 32768。

#### Scenario: Reject invalid parent kind
- **WHEN** create_work_item 被调用，kind="requirement"，parent_id 指向一个 kind="task" 的记录
- **THEN** 系统返回错误，拒绝创建

#### Scenario: Project has no parent
- **WHEN** create_work_item 被调用，kind="project"
- **THEN** parent_id MUST 为 None，否则返回错误

### Requirement: Work item hierarchy validation

系统 SHALL 强制执行以下父子层级规则：
- `project` → 无父级
- `requirement` → 父级必须是 `project`
- `task` → 父级必须是 `requirement`
- `subtask` → 父级必须是 `task`

#### Scenario: Valid hierarchy chain
- **WHEN** 一个 project 包含 requirement，requirement 包含 task，task 包含 subtask
- **THEN** 所有 CRUD 操作正常执行

#### Scenario: Kind normalization
- **WHEN** kind 传入大小写混合值（如 "Requirement"、"REQUIREMENT"）
- **THEN** 系统 normalize 为小写 "requirement" 处理

#### Scenario: Kind normalization fallback
- **WHEN** kind 传入未知值（如 "epic"、""）
- **THEN** 系统回落为 "task"

### Requirement: Work item dependency graph

系统 SHALL 通过 `work_item_dependency` 表维护同父级下 work item 之间的有向依赖关系。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `i32` | PK |
| `predecessor_id` | `i32` | 前置工作项 ID |
| `successor_id` | `i32` | 后继工作项 ID |
| `created_at` | `i64` | 创建时间 |

依赖关系限制在同父级的 children 范围内。保存编排时采用全量替换策略（删除旧边，插入新边），在数据库事务中执行。

编排保存的校验规则：
- items 数组必须恰好包含该 parent 的全部 children（不多不少）
- 禁止自引用依赖（predecessor_id ≠ successor_id）
- dependency 两端必须在 children 集合内

#### Scenario: Save orchestration replaces all dependencies
- **WHEN** save_work_item_orchestration 被调用，传入 parent_id 和一组新的 dependency edges
- **THEN** 系统在事务中删除该 parent 下所有旧 dependency，插入新 dependency，并按提交顺序更新各 work item 的 priority

#### Scenario: Save orchestration rejects incomplete items list
- **WHEN** save_work_item_orchestration 传入的 items 缺少某个 child
- **THEN** 系统返回错误 "orchestration items must include every child exactly once"

#### Scenario: Save orchestration rejects self-referential dependency
- **WHEN** dependency 中 predecessor_id == successor_id
- **THEN** 系统返回错误 "dependency cannot be self-referential"

#### Scenario: Dependencies scoped to same parent
- **WHEN** get_work_item_orchestration 被调用，传入 parent_id
- **THEN** 系统仅返回 parent 下 children 之间的 dependency edges，不包含跨 parent 的依赖

### Requirement: Work item CRUD API

系统 SHALL 通过 Tauri commands 暴露以下接口：

| Command | 入参 | 出参 | 说明 |
|---|---|---|---|
| `list_work_items` | `WorkItemListQuery` | `WorkItemListResult` | 分页列表 + 过滤/排序 |
| `get_work_item_detail` | `{ id: i32 }` | `WorkItem` | 单条详情 |
| `create_work_item` | `CreateWorkItemPayload` | `WorkItem` | 创建 |
| `update_work_item` | `UpdateWorkItemPayload` | `WorkItem` | 更新 |
| `delete_work_item` | `{ id: i32 }` | `()` | 删除（级联删除 children 和 dependencies） |
| `list_parent_projects` | `{}` | `Vec<WorkItemParentOption>` | 所有 project 供下拉选择 |
| `list_parent_requirements` | `{}` | `Vec<WorkItemParentOption>` | 所有 requirement 供下拉选择 |
| `list_parent_tasks` | `{}` | `Vec<WorkItemParentOption>` | 所有 task 供下拉选择 |
| `get_work_item_orchestration` | `{ parent_id: i32 }` | `WorkItemOrchestration` | 获取编排数据 |
| `save_work_item_orchestration` | `SaveOrchestrationPayload` | `()` | 保存编排 |

查询参数 `WorkItemListQuery`：
- `page`, `pageSize` — 分页（默认 page=1, pageSize=10，最大 100）
- `kind` — 按 kind 过滤
- `parentId` — 按 parent_id 过滤
- `keyword` — 模糊搜索（匹配 title, item_id, owner，不区分大小写）
- `status`, `priority` — 精确匹配过滤
- `sortField` — "updatedAt" | "title" | "priority"
- `sortOrder` — "ascend" | "descend"

#### Scenario: List with combined filters
- **WHEN** list_work_items 传入 kind="task", parentId=42, keyword="auth", sortField="priority", sortOrder="ascend"
- **THEN** 返回 parent_id=42 且 kind="task" 且 title/item_id/owner 包含 "auth" 的记录，按 priority 升序排列，分页返回

#### Scenario: Delete cascades to children and dependencies
- **WHEN** delete_work_item 删除一个 requirement
- **THEN** 其下所有 task/subtask 以及指向这些 work item 的 dependency edges 全部被删除

### Requirement: Work item frontend API adapter layer

前端 SHALL 通过 `src/api/` 下的适配层将通用 work-item API 转换为领域专用接口：

- `src/api/requirement.ts` — `listRequirements` 封装 `listWorkItems(kind="requirement")`，映射字段名（itemId→reqId, parentId→projectId）
- `src/api/task.ts` — `listTasks` 封装 `listWorkItems(kind="task")`，映射字段名（itemId→taskId, parentId→requirementId）
- `src/api/work-item.ts` — 已废弃，re-export `@/shared/work-item/api`

#### Scenario: Requirement API field mapping
- **WHEN** 前端调用 `listRequirements()`
- **THEN** 内部调用 `listWorkItems({ kind: "requirement" })`，返回的 WorkItem 字段被映射为 RequirementItem（itemId→reqId, parentId→projectId, effort 默认 0, planMonth 默认 ""）

### Requirement: Boards page - hierarchical work item view

`features/boards/BoardsPage` SHALL 提供分层工作项管理界面：
- Tab 切换：dashboard / projects / requirements / tasks（基于 URL search params）
- 展开式树形表格（project → requirement → task → subtask）
- CRUD 操作：创建（modal 表单）、编辑（WorkItemEditModal）、删除
- 编排入口：打开 WorkItemOrchestrationModal 进行子项排序和依赖管理
- 列定制：列可见性、列序、列宽持久化
- 过滤：keyword / status / owner
- 远程排序：title / updatedAt

#### Scenario: User expands a project row
- **WHEN** 用户点击 project 行的展开按钮
- **THEN** 表格加载该 project 下的 requirements，显示缩进的树形层级

### Requirement: Work item orchestration modal

`features/work-item-orchestration/WorkItemOrchestrationModal` SHALL 提供可视化编排界面：
- 绝对定位网格画布，卡片可拖拽重排（行 = 优先级顺序，列 = 泳道）
- 依赖连线：点击一个卡片选为前置，点击另一个创建依赖边（SVG 路径 + 箭头）
- 依赖列表：下方显示所有依赖关系，支持删除
- 保存：通过 `saveWorkItemOrchestration` 持久化行序、列位和依赖
- 脏状态追踪：未保存时关闭弹窗需确认

#### Scenario: User creates a dependency edge
- **WHEN** 用户点击卡片 A 选中，再点击卡片 B
- **THEN** 系统在 A → B 之间画一条有向箭头线，并在下方依赖列表中新增一条记录

### Requirement: Known deviations from architecture.md

系统存在以下与 architecture.md 设计文档的已知偏差：

1. **统一模型 vs 独立表**：architecture.md 设计 requirement/task 各自独立表，实际实现为 work_item 单表多态
2. **优先级类型**：architecture.md 设计为 P0-P3 字符串，实际为 i32 数值（0-65535）
3. **依赖关系**：architecture.md 未设计任务间依赖图，实际实现了 work_item_dependency 有向图
4. **缓存层**：architecture.md 未提及内存缓存，实际实现了 data_access 门面 + DataCache
5. **遗留表**：migration 中仍存在独立的 `requirement` 和 `task` 表，字段类型有偏差（priority 为 String vs i32），DataCache 不缓存这些表，新代码通过 work_item 访问

#### Scenario: AI implementing new feature queries existing data model
- **WHEN** AI 需要了解工作项数据结构
- **THEN** AI SHALL 以 work_item 单表为准，不使用遗留的 requirement/task 表
