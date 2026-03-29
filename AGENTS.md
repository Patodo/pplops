# Agent / contributor notes

## Package manager

- **Use pnpm only** for Node dependencies (`pnpm install`, `pnpm add`, `pnpm run …`).

## 并行开发边界（前端）

- **编排**：`src/features/work-item-orchestration/`（对外只从 `@/features/work-item-orchestration` 的 `index.ts` 引用）。
- **priority 数值域（0–65535、默认中间值）**：`src/lib/workItemPriority.ts`（与表单、看板创建等共用；改编排网格编码改 feature 内 `priorityGrid.ts`）。

