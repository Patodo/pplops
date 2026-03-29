import { describe, expect, it } from "vitest";
import type { WorkItemKind } from "@/shared/work-item";
import {
  ALL_WORK_ITEM_KINDS,
  DEFAULT_WORK_ITEM_PRIORITY,
  KIND_DISPLAY_TITLE,
  PRIORITY_VALUE_MAX,
  PRIORITY_VALUE_MIN,
  PROJECT_AND_REQUIREMENT_STATUS_OPTIONS,
  TASK_AND_SUBTASK_STATUS_OPTIONS,
} from "@/test/domainSpec";
import {
  defaultWorkItemPriority,
  kindTitleMap,
  statusOptionsForKind,
  workItemPriorityInputProps,
} from "./work-item-form";

describe("工作项表单配置（类型决定可选状态与展示）", () => {
  it("项目与需求使用同一套生命周期状态选项", () => {
    for (const kind of ["project", "requirement"] as const satisfies readonly WorkItemKind[]) {
      expect(statusOptionsForKind(kind)).toEqual([...PROJECT_AND_REQUIREMENT_STATUS_OPTIONS]);
    }
  });

  it("任务与子任务使用同一套生命周期状态选项", () => {
    for (const kind of ["task", "subtask"] as const satisfies readonly WorkItemKind[]) {
      expect(statusOptionsForKind(kind)).toEqual([...TASK_AND_SUBTASK_STATUS_OPTIONS]);
    }
  });

  it("优先级数值边界与默认值与域规格一致", () => {
    expect(workItemPriorityInputProps.min).toBe(PRIORITY_VALUE_MIN);
    expect(workItemPriorityInputProps.max).toBe(PRIORITY_VALUE_MAX);
    expect(defaultWorkItemPriority).toBe(DEFAULT_WORK_ITEM_PRIORITY);
  });

  it("各工作项类型的界面标题与域规格一致", () => {
    for (const kind of ALL_WORK_ITEM_KINDS) {
      expect(kindTitleMap[kind]).toBe(KIND_DISPLAY_TITLE[kind]);
    }
  });
});
