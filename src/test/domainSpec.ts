/**
 * PPLOps 前端域规格（测试用「真相源」）
 *
 * 说明：
 * - 描述工作项层级、状态机、与后端通信时用户可见/契约相关约定。
 * - 单测从本文件取期望，不从实现抄断言；实现偏离规格时应失败。
 */

import type { WorkItemKind } from "@/shared/work-item";
import {
  DEFAULT_WORK_ITEM_PRIORITY,
  PRIORITY_VALUE_MAX,
  PRIORITY_VALUE_MIN,
} from "@/lib/workItemPriority";

export { DEFAULT_WORK_ITEM_PRIORITY, PRIORITY_VALUE_MAX, PRIORITY_VALUE_MIN };

/** 全部工作项类型（层级：项目 → 需求 → 任务 → 子任务） */
export const ALL_WORK_ITEM_KINDS: WorkItemKind[] = ["project", "requirement", "task", "subtask"];

/** 项目/需求共用一套生命周期状态（与需求类型 RequirementStatus 一致） */
export const PROJECT_AND_REQUIREMENT_STATUS_OPTIONS = [
  { label: "准备中", value: "preparing" },
  { label: "新建", value: "new" },
  { label: "已排期", value: "planned" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
] as const;

/** 任务/子任务共用一套生命周期状态 */
export const TASK_AND_SUBTASK_STATUS_OPTIONS = [
  { label: "待开始", value: "todo" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "done" },
  { label: "已取消", value: "cancelled" },
] as const;

/** 工作项 priority 数值域（0–65535，越小越优先），与 SQLite / Tauri 契约一致（见上方 re-export） */

/** 类型在界面上的展示名 */
export const KIND_DISPLAY_TITLE: Record<WorkItemKind, string> = {
  project: "项目",
  requirement: "需求",
  task: "任务",
  subtask: "子任务",
};

/**
 * 日期展示约定：使用 UTC 日历日的 ISO 日期部分 YYYY-MM-DD。
 * （与存储/传输常用 ISO 字符串一致；跨日边界以 UTC 为准。）
 */
export function expectedFormatDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 新建子任务时未显式指定则采用的业务默认 */
export const DEFAULT_NEW_SUBTASK = {
  status: "todo",
  priority: DEFAULT_WORK_ITEM_PRIORITY,
  plannedHours: 0,
  actualHours: 0,
} as const;

/** Tauri 命令名契约：统一工作项 CRUD 与父级选项 */
export const TAURI_WORK_ITEM_COMMANDS = {
  list: "list_work_items",
  detail: "get_work_item_detail",
  create: "create_work_item",
  update: "update_work_item",
  delete: "delete_work_item",
  parentProjects: "list_parent_projects",
  parentRequirements: "list_parent_requirements",
  parentTasks: "list_parent_tasks",
  orchestrationGet: "get_work_item_orchestration",
  orchestrationSave: "save_work_item_orchestration",
} as const;

/** 成员模块 Tauri 命令名 */
export const TAURI_MEMBER_COMMANDS = {
  ping: "member_ping",
  count: "member_count",
  list: "list_members",
  listGroups: "list_member_groups",
  create: "create_member",
  update: "update_member",
  delete: "delete_member",
  detail: "get_member_detail",
} as const;
