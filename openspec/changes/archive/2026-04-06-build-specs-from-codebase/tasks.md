## 1. 创建 spec 目录结构

- [x] 1.1 在 `openspec/specs/` 下创建 6 个 capability 目录：`work-item`、`member`、`data-access-facade`、`app-settings`、`app-shell`、`shared-ui`
- [x] 1.2 将 `changes/build-specs-from-codebase/specs/` 下各 spec.md 复制到对应的 `openspec/specs/<capability>/spec.md`

## 2. 更新 OpenSpec config

- [x] 2.1 在 `openspec/config.yaml` 的 context 中补充项目技术栈信息（Tauri 2.x + React 18 + Rust + SQLite + SeaORM + Zustand + Ant Design + Vite）
- [x] 2.2 在 config.yaml 中补充领域约定（单表多态 work_item、数据访问门面模式、feature-based 前端组织）

## 3. 验证 spec 准确性

- [x] 3.1 对照 `pplops/src-tauri/src/models/work_item.rs` 验证 work-item spec 的字段定义和约束
- [x] 3.2 对照 `pplops/src-tauri/src/services/work_item.rs` 验证业务规则（层级校验、ID 生成、编排逻辑）
- [x] 3.3 对照 `pplops/src-tauri/src/data_access/work_item.rs` 和 `cache.rs` 验证 data-access-facade spec 的缓存路由逻辑
- [x] 3.4 对照 `pplops/src-tauri/src/models/member.rs` 和 `services/member.rs` 验证 member spec
- [x] 3.5 对照 `pplops/src-tauri/src/models/app_setting.rs` 和 `commands/app_settings.rs` 验证 app-settings spec
- [x] 3.6 对照 `pplops/src/App.tsx`、`AppLayout.tsx`、`featureRegistry.tsx` 验证 app-shell spec
- [x] 3.7 对照 `pplops/src/components/` 目录验证 shared-ui spec 的组件描述

## 4. 修正发现的偏差

- [x] 4.1 若验证中发现 spec 与代码不一致，更新对应 spec.md 使其精确反映 as-built 状态

修正内容：
- work-item spec：pageSize 默认 20→10，补充创建默认值，补充 kind fallback，补充编排校验规则
- data-access-facade spec：补充默认排序细节，修正 delete 缓存行为（仅移除单条 + dependency 边），补充 member keyword 包含 role
- member spec：keyword 匹配补充 role 字段
