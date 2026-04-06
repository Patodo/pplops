## ADDED Requirements

### Requirement: App setting key-value store

系统 SHALL 使用 `app_setting` 表存储应用级配置：

| 字段 | 类型 | 约束 |
|---|---|---|
| `key` | `String` | PK（无自增） |
| `value` | `String` | 值 |

当前已使用的 key：
- `"memory_cache_mode"` — 值为 "true"/"false"

#### Scenario: Upsert setting value
- **WHEN** app_setting::upsert_value 被调用，key="memory_cache_mode"，value="true"
- **THEN** 系统在 app_setting 表中 INSERT OR UPDATE 该 key-value 对

### Requirement: App info endpoint

系统 SHALL 通过 `get_app_info` command 返回应用元信息：

| Command | 入参 | 出参 |
|---|---|---|
| `get_app_info` | `{}` | `{ name: String, version: String }` |

name 和 version 从 `tauri::AppHandle::package_info()` 读取（即 Cargo.toml / tauri.conf.json 中的配置）。

#### Scenario: Get app info
- **WHEN** get_app_info 被调用
- **THEN** 返回应用名称和版本号

### Requirement: App settings commands

系统 SHALL 通过以下 Tauri commands 管理应用设置：

| Command | 入参 | 出参 | 说明 |
|---|---|---|---|
| `get_app_settings` | `{}` | `{ memoryCacheMode: bool, cacheLoaded: bool }` | 读取当前设置 |
| `set_app_settings` | `{ memoryCacheMode: bool }` | `()` | 更新设置并触发缓存状态变更 |
| `refresh_data_cache` | `{}` | `()` | 重新加载缓存数据 |

#### Scenario: Set memory cache mode to true
- **WHEN** set_app_settings 传入 memoryCacheMode=true
- **THEN** 系统将 "memory_cache_mode" 持久化为 "true"，更新内存状态，触发 hydrate_from_db

#### Scenario: Set memory cache mode to false
- **WHEN** set_app_settings 传入 memoryCacheMode=false
- **THEN** 系统将 "memory_cache_mode" 持久化为 "false"，更新内存状态，清空缓存

#### Scenario: Refresh cache when disabled
- **WHEN** refresh_data_cache 被调用，但 memory_cache_mode=false
- **THEN** 系统不执行任何操作（静默返回）

### Requirement: Settings frontend page

`pages/Settings` SHALL 提供：
- 内存缓存模式开关（Switch 组件，绑定 setAppSettings）
- 缓存状态显示（loaded / not-loaded）
- "从数据库刷新缓存" 按钮（调用 refreshDataCache）

#### Scenario: User toggles cache and sees status
- **WHEN** 用户打开设置页
- **THEN** 页面显示当前缓存模式开关状态和缓存加载状态
