## ADDED Requirements

### Requirement: PplopsDataTable component

`components/Table/PplopsDataTable` SHALL 提供统一的数据表格组件，支持：
- 分页（pageSize 切换、page 翻页，远程分页回调）
- 远程排序（sortField + sortOrder，通过回调传递）
- 列定制持久化（列可见性、列序、列宽），通过 `usePersistedColumnLayout` hook 管理
- 列设置弹窗（`ColumnSettingsModal`），用户可拖拽调整列序和勾选可见性
- 可调整宽度的表头（`ResizableHeaderCell`）

#### Scenario: User customizes columns
- **WHEN** 用户打开列设置弹窗，拖拽调整列序，取消勾选某列
- **THEN** 表格立即反映新列序和可见性，设置持久化到 localStorage

#### Scenario: Table with remote pagination
- **WHEN** 用户翻到第 2 页
- **THEN** 组件通过 onChange 回调传递新的 page 和 pageSize，由父组件触发远程数据请求

### Requirement: Column layout persistence

`usePersistedColumnLayout` hook SHALL 管理列布局的持久化存储：
- 存储键基于表格唯一标识（如 "boards-table"）
- 持久化内容：各列的 visible, order, width
- 存储位置：localStorage
- 提供 `mergeResizableColumns` 工具函数，将用户自定义与默认列配置合并

`applyColumnSortMeta` 工具函数处理列排序元数据的应用。

#### Scenario: Column layout survives page reload
- **WHEN** 用户调整列宽和列序后刷新页面
- **THEN** 表格恢复到用户上次设定的列布局

### Requirement: HierarchicalTreeCell component

`components/Table/HierarchicalTreeCell` SHALL 在表格单元格中渲染树形层级缩进：
- 根据 level（层级深度）显示缩进线
- 支持展开/折叠交互（hasChildren 控制展开图标显示）
- 视觉上呈现 project → requirement → task → subtask 的嵌套关系

#### Scenario: Tree cell with children
- **WHEN** 渲染一个 level=1 且 hasChildren=true 的单元格
- **THEN** 显示一级缩进线和展开箭头图标

### Requirement: DetailEditModal framework

`components/DetailEditModal/DetailEditModalFrame` SHALL 提供统一的详情编辑弹窗框架：
- 左右分栏布局：左侧 Markdown 预览（`MarkdownDetailPreview`），右侧编辑区（`MarkdownEditorArea`）
- 支持 Mermaid 图表渲染（`components/Markdown/MermaidBlock`）
- 编辑模式切换（预览/编辑）
- 自定义表单字段区域（children slot）

#### Scenario: User edits markdown content
- **WHEN** 用户在弹窗右侧编辑区修改 Markdown 内容
- **THEN** 左侧预览区实时更新渲染结果

### Requirement: WorkItemEditModal

`components/WorkItem/WorkItemEditModal` SHALL 提供工作项编辑弹窗：
- 表单字段根据 work item kind 动态显示（requirement 显示 effort/planMonth，task 显示 plannedHours/actualHours/dueDate）
- 调用 `updateWorkItem` API 保存变更
- 保存后触发父组件刷新

#### Scenario: Edit a requirement
- **WHEN** 用户编辑一个 requirement 的 effort 和 planMonth
- **THEN** 弹窗显示 effort 和 planMonth 输入框，保存时调用 updateWorkItem

### Requirement: MemberDetailModal

`components/Member/MemberDetailModal` SHALL 提供成员详情弹窗：
- 显示成员基本信息（name, role, direction, hireDate, workYears, memberType, groupName, status）
- 支持编辑并调用 `updateMember` API 保存

#### Scenario: Edit member role
- **WHEN** 用户修改成员的 role 字段并保存
- **THEN** 调用 updateMember API，成功后刷新父组件数据

### Requirement: PlaceholderPage component

`components/PlaceholderPage` SHALL 为未实现的页面提供占位展示：
- 显示页面标题（title prop）
- 显示描述文字（description prop）
- 统一的空状态样式

#### Scenario: Unimplemented page displays placeholder
- **WHEN** 用户访问一个未实现的功能页面（如甘特图）
- **THEN** 页面显示 PlaceholderPage 组件，标题为"甘特图"，描述为功能说明

### Requirement: StatusBadge component

`components/StatusBadge` SHALL 提供统一的状态标签组件：
- 根据 status 值映射不同颜色
- 用于 work item 和 member 状态的视觉标识

#### Scenario: Work item status display
- **WHEN** 渲染一个 status="in_progress" 的工作项
- **THEN** StatusBadge 显示对应颜色的状态标签

### Requirement: WorkloadIndicator component

`components/WorkloadIndicator` SHALL 提供负荷指示器：
- 根据负荷程度显示绿（正常）/黄（闲置）/红（超载）颜色
- 用于成员工时和计划排期的负荷可视化

#### Scenario: Overloaded member indicator
- **WHEN** 成员某周工时超过该周工作日数
- **THEN** WorkloadIndicator 显示红色标识
