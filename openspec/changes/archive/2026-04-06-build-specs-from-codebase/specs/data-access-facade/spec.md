## ADDED Requirements

### Requirement: Data access facade architecture

系统 SHALL 通过 `data_access` 模块统一所有数据读写的入口，commands 层 MUST NOT 直接调用 services 或 repositories，必须通过 data_access 门面。

data_access 模块包含三个子模块：
- `cache` — DataCache 结构定义与 hydration 逻辑
- `work_item` — 工作项的缓存读写路由
- `member` — 成员的缓存读写路由

#### Scenario: Command calls data_access instead of service
- **WHEN** 一个 Tauri command 需要读取 work_item 数据
- **THEN** MUST 调用 `data_access::work_item` 函数，而非直接调用 `services::work_item`

### Requirement: DataCache structure

`DataCache` 结构 SHALL 维护以下内存状态：

| 字段 | 类型 | 说明 |
|---|---|---|
| `memory_cache_enabled` | `bool` | 缓存开关（由 app_setting "memory_cache_mode" 控制） |
| `loaded` | `bool` | 是否已完成初始 hydrate |
| `work_items` | `HashMap<i32, work_item::Model>` | 全部工作项，以 id 为 key |
| `dependencies` | `Vec<work_item_dependency::Model>` | 全部依赖边 |
| `members` | `HashMap<i32, member::Model>` | 全部成员，以 id 为 key |

DataCache 通过 `tokio::sync::RwLock` 保护，支持异步安全并发访问。

#### Scenario: Cache hydration from database
- **WHEN** hydrate_from_db 被调用
- **THEN** 系统从 SQLite 一次性加载所有 work_item、work_item_dependency、member 记录到内存 HashMap/Vec 中，设置 loaded=true

### Requirement: Cache-first read routing

当 `memory_cache_enabled == true && loaded == true` 时，所有读操作 SHALL 优先从内存缓存获取数据：

- `list_work_items` — 内存过滤/排序/分页
- `get_work_item_detail` — HashMap lookup
- `list_parent_*` — 内存过滤 by kind
- `get_work_item_orchestration` — 内存过滤 children + dependencies
- `list_members` / `member_count` / `get_member_detail` / `list_member_groups` — 内存查询

当缓存不可用时（enabled=false 或 loaded=false），SHALL 降级到数据库查询（通过 services 层）。

内存查询引擎支持：
- 过滤：kind, parentId, keyword（大小写不敏感匹配 title/item_id/owner）, status, priority, group_name, member_type
- 排序：updatedAt, title, priority, name, workYears，支持 asc/desc
- 默认排序：无显式 sortField 时，若 parentId 存在则按 priority ASC → updatedAt DESC → id ASC；否则按 updatedAt DESC → id ASC
- 分页：page/pageSize 参数（pageSize 默认 10，最大 100）
- has_children 计算：`compute_parents_with_children_for_page` 判断当前页哪些项有子级

#### Scenario: Cached list with keyword filter
- **WHEN** list_work_items 在缓存模式下收到 keyword="auth"
- **THEN** 系统遍历内存 HashMap，筛选 title/item_id/owner 包含 "auth"（不区分大小写）的记录

#### Scenario: Fallback to database when cache disabled
- **WHEN** list_work_items 被调用，但 memory_cache_enabled=false
- **THEN** 系统通过 services::work_item 从 SQLite 查询

### Requirement: Write-through cache sync

所有写操作（create/update/delete）SHALL 先写入数据库，成功后同步更新内存缓存：

- `create_*` — 写 DB → 将新行加入 HashMap
- `update_*` — 写 DB → 替换 HashMap 中对应条目
- `delete_*` — 写 DB → 从 HashMap 移除条目

编排保存时（save_work_item_orchestration）SHALL 同步所有受影响的 work_item 行并重新加载所有 dependency edges。

#### Scenario: Update work item syncs cache
- **WHEN** update_work_item 成功更新数据库记录
- **THEN** DataCache.work_items 中对应 id 的条目被替换为更新后的 Model

#### Scenario: Delete work item removes from cache
- **WHEN** delete_work_item 成功删除数据库记录
- **THEN** DataCache.work_items 中该 id 的条目被移除，dependencies 中所有 predecessor_id 或 successor_id 匹配该 id 的边被清除

注意：缓存层仅移除被删除的单条记录和相关 dependency 边，不主动级联移除 children 的缓存条目（children 的 DB 级联删除由 repository 层处理，缓存中的 children 条目可能在下次 list 时被过滤掉或保持 stale 直到缓存刷新）。

### Requirement: Cache lifecycle management

缓存的生命周期 SHALL 通过 app_settings 命令控制：

- `get_app_settings` — 读取当前 memory_cache_mode 和 cache_loaded 状态
- `set_app_settings` — 切换缓存模式：
  - 关闭时：清空缓存（loaded=false, HashMap clear）
  - 开启时：hydrate_from_db 重新加载
- `refresh_data_cache` — 若缓存已启用，重新 hydrate

缓存 hydrate 仅在模式切换为开启时自动触发，不会在应用启动时无条件加载。

#### Scenario: User enables cache mode
- **WHEN** 用户在设置页开启内存缓存
- **THEN** 系统调用 hydrate_from_db 加载全量数据，后续读操作走缓存

#### Scenario: User disables cache mode
- **WHEN** 用户关闭内存缓存
- **THEN** 系统清空内存数据，后续读操作降级到数据库查询
