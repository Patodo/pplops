/**
 * 工作项 priority 数值域（全站共用）。
 * 编排画布如何把列/行编码进 priority 见 `features/work-item-orchestration/priorityGrid.ts`。
 */

export const PRIORITY_VALUE_MIN = 0;
export const PRIORITY_VALUE_MAX = 65535;
/** 中间值：与列表默认排序一致。 */
export const DEFAULT_WORK_ITEM_PRIORITY = 32_768;
