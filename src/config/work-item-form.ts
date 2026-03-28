import type { WorkItemKind } from "@/types/work-item";

export const priorityOptions = [
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
  { label: "紧急", value: "critical" },
];

const projectAndRequirementStatus = [
  { label: "准备中", value: "preparing" },
  { label: "新建", value: "new" },
  { label: "已排期", value: "planned" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
];

const taskAndSubtaskStatus = [
  { label: "待开始", value: "todo" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "done" },
  { label: "已取消", value: "cancelled" },
];

export function statusOptionsForKind(kind: WorkItemKind) {
  if (kind === "project" || kind === "requirement") {
    return projectAndRequirementStatus;
  }
  return taskAndSubtaskStatus;
}

export const kindTitleMap: Record<WorkItemKind, string> = {
  project: "项目",
  requirement: "需求",
  task: "任务",
  subtask: "子任务",
};
