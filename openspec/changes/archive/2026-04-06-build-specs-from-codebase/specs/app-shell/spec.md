## ADDED Requirements

### Requirement: Application root component

`App.tsx` SHALL 作为应用根组件：
- 包裹 `ConfigProvider`（Ant Design 中文 locale）
- 包裹 `BrowserRouter`
- 渲染 `AppLayout` 组件，内含从 `featureRouteDescriptors` 构建的路由
- 默认路由 `/` 重定向到 `/boards`

#### Scenario: App loads with default route
- **WHEN** 应用启动
- **THEN** 用户被重定向到 /boards，显示看板页面

### Requirement: App layout structure

`components/Layout/AppLayout` SHALL 提供主布局框架：
- Ant Design `Layout` + 可折叠 `Sider`（深色主题，展开宽度 220px）
- 侧边栏折叠状态存储在 Zustand `appStore`
- 侧边栏菜单分三组：
  - "核心看板" — 来自 boards nav
  - "规划与成员" — 来自 planning nav + members nav
  - "运营管理" — 来自 opsNav（workload, meetings, reports, settings）
- 当前激活菜单项与 URL pathname 匹配
- 内容区域渲染 `<Outlet />` 嵌套路由

#### Scenario: User collapses sidebar
- **WHEN** 用户点击侧边栏折叠按钮
- **THEN** 侧边栏收起为图标模式，状态持久化到 Zustand store

### Requirement: Feature registration system

系统 SHALL 使用 `featureRegistry.tsx` 集中注册所有功能模块的路由：

每个 feature 模块导出：
- 路由描述符（React Router `<Route>` 元素）
- 导航项配置（`nav.ts` / `nav.tsx`）

`featureRouteDescriptors` 数组包含 4 个功能组：
- boards — `/boards` 及子路由
- planning — `/planning` 及子路由（overview, month, week, gantt）
- members — `/members` 及子路由（list, detail, skills）
- ops — workload, meetings, reports, settings

新增功能时 MUST：
1. 在 `src/features/<name>/` 创建 feature 目录
2. 导出 `nav.ts` 配置导航项
3. 在 `featureRegistry.tsx` 注册路由
4. 在 `AppLayout` 的导航分组中引入

#### Scenario: New feature is registered
- **WHEN** 开发者创建新 feature 目录并注册路由和导航
- **THEN** 该功能自动出现在侧边栏对应分组中，URL 路由生效

### Requirement: Navigation configuration

导航项 SHALL 由各 feature 模块独立定义，AppLayout 仅组合显示：

- `features/boards/nav.tsx` — 看板导航项
- `features/planning/nav.tsx` — 计划子菜单（总览、月度、周度、甘特图）
- `features/members/nav.tsx` — 成银子菜单（列表、技能矩阵）
- `shared/opsNav.tsx` — 运营管理导航（工时、会议、报表、设置）

`AppNavItem` 类型定义在 `shared/appNav.ts`：
```typescript
{ key: string; icon?: ReactNode; label: string }
```

导航 key 使用路径格式（如 "/boards"、"/planning/gantt"）。

#### Scenario: Navigation item matches current route
- **WHEN** 用户访问 /members/123
- **THEN** 侧边栏 "/members" 项高亮为激活状态

### Requirement: Shared navigation types

`shared/appNav.ts` SHALL 导出 `AppNavItem` 类型供所有 nav 模块使用，确保导航配置的类型一致性。

#### Scenario: Feature defines navigation using shared type
- **WHEN** 新 feature 的 nav.ts 导入 AppNavItem
- **THEN** TypeScript 类型检查确保 nav 配置包含 key 和 label 字段
