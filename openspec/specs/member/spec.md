## ADDED Requirements

### Requirement: Member data model

系统 SHALL 使用独立 `member` 表存储团队成员信息（不通过 work_item 多态表）。

字段定义：
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `i32` | PK, auto-increment |
| `member_id` | `String` | 业务标识，自动生成 "MEM-{timestamp}" |
| `name` | `String` | 显示名，创建时 trim，默认 "unnamed member" |
| `role` | `String` | 职位角色，默认 "dev" |
| `direction` | `String` | 技术方向（如 "fe"/"be"/"algo" 等），默认 "" |
| `hire_date` | `String` | 入职日期字符串，默认 "" |
| `work_years` | `f64` | 工作年限，默认 0.0 |
| `member_type` | `String` | 雇佣类型（"employee"/"outsource" 等），默认 "employee" |
| `group_name` | `String` | 所属分组，默认 "ungrouped" |
| `status` | `String` | 状态（"active" 等），默认 "active" |
| `content` | `String` | Markdown 自由文本，创建时按模板生成 |
| `updated_at` | `i64` | Unix 时间戳 |
| `created_at` | `i64` | Unix 时间戳 |

与 work_item 的关联：work_item.owner 字段存储 member.name 字符串（无 FK 约束，应用层匹配）。

#### Scenario: Create member with defaults
- **WHEN** create_member 被调用，仅提供 name="张三"
- **THEN** 系统自动生成 member_id，role="dev"，member_type="employee"，group_name="ungrouped"，status="active"，content 按模板生成（包含技能、目标、项目履历占位）

#### Scenario: Member auto-generated template content
- **WHEN** 新 member 被创建
- **THEN** content 字段生成包含以下章节的 Markdown 模板：基本画像、技能清单、近期目标、参与项目、备注

### Requirement: Member CRUD API

系统 SHALL 通过 Tauri commands 暴露以下接口：

| Command | 入参 | 出参 | 说明 |
|---|---|---|---|
| `member_count` | `{}` | `i32` | 总人数 |
| `list_members` | `MemberListQuery` | `MemberListResult` | 分页列表 + 过滤/排序 |
| `create_member` | `CreateMemberPayload` | `Member` | 创建 |
| `update_member` | `UpdateMemberPayload` | `Member` | 更新 |
| `delete_member` | `{ id: i32 }` | `()` | 删除 |
| `get_member_detail` | `{ id: i32 }` | `Member` | 详情 |
| `list_member_groups` | `{}` | `Vec<String>` | 所有分组名（去重） |
| `member_ping` | `{}` | `"member"` | 健康检查 |

查询参数 `MemberListQuery`：
- `page`, `pageSize` — 分页（默认 page=1, pageSize=20）
- `keyword` — 模糊搜索（匹配 name, member_id, role，不区分大小写）
- `group_name` — 按分组过滤
- `member_type` — 按雇佣类型过滤
- `status` — 按状态过滤
- `sortField` — "name" | "workYears" | "updatedAt"
- `sortOrder` — "ascend" | "descend"

#### Scenario: List with group filter
- **WHEN** list_members 传入 group_name="backend"
- **THEN** 返回 group_name="backend" 的成员列表

#### Scenario: List groups returns distinct values
- **WHEN** list_member_groups 被调用
- **THEN** 返回数据库中所有不重复的 group_name 值

### Requirement: Member frontend page

`features/members/MembersListPage` SHALL 提供成员管理界面：
- 分页数据表格，使用 PplopsDataTable 组件
- 过滤：keyword / memberType / group / status
- 远程排序：name / workYears / updatedAt
- 创建：modal 表单（name, role, direction, hireDate, workYears, memberType, groupName, status）
- 编辑/删除：行内操作，编辑打开 MemberDetailModal
- 列定制持久化

`features/members/MemberDetailPage` 为路由包装组件，从 URL 提取 id 参数渲染 MemberDetailModal。

#### Scenario: User creates a member
- **WHEN** 用户在成员列表页点击创建按钮，填写表单并提交
- **THEN** 系统调用 createMember API，刷新列表，新成员出现在表格中

#### Scenario: Member detail from URL
- **WHEN** 用户访问 /members/:id
- **THEN** 系统提取 URL 中的 id，渲染 MemberDetailModal；若 id 无效则重定向到 /members
