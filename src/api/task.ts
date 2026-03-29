import { invoke } from "@tauri-apps/api/core";
import {
  createWorkItem,
  deleteWorkItem,
  getWorkItemDetail,
  listParentRequirements,
  listParentTasks,
  listWorkItems,
  updateWorkItem,
} from "@/api/work-item";
import type { WorkItem } from "@/types/work-item";
import { DEFAULT_WORK_ITEM_PRIORITY } from "@/lib/workItemPriorityLayout";
import type {
  CreateTaskPayload,
  TaskDetail,
  TaskItem,
  TaskListQuery,
  TaskListResult,
  TaskRequirementOption,
  UpdateTaskDetailPayload,
  UpdateTaskPayload,
} from "@/types/task";

export async function pingTask(): Promise<string> {
  return invoke<string>("task_ping");
}

export async function listTasks(query: TaskListQuery): Promise<TaskListResult> {
  const result = await listWorkItems({
    page: query.page,
    pageSize: query.pageSize,
    kind: "task",
    parentId: query.requirementId,
    keyword: query.keyword,
    status: query.status,
    priority: query.priority,
    sortField: query.sortField === "updatedAt" ? "updatedAt" : undefined,
    sortOrder: query.sortOrder,
  });
  return { ...result, items: result.items.map(toTaskItem) };
}

export async function listTaskRequirements(): Promise<TaskRequirementOption[]> {
  const rows = await listParentRequirements();
  return rows.map((row) => ({ id: row.id, reqId: row.itemId, title: row.title }));
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskItem> {
  const item = await createWorkItem({
    kind: "task",
    parentId: payload.requirementId,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    owner: payload.owner,
    plannedHours: payload.plannedHours,
    actualHours: payload.actualHours,
    dueDate: payload.dueDate,
  });
  return toTaskItem(item);
}

export async function updateTask(payload: UpdateTaskPayload): Promise<TaskItem> {
  const item = await updateWorkItem({
    id: payload.id,
    parentId: payload.requirementId,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    owner: payload.owner,
    plannedHours: payload.plannedHours,
    actualHours: payload.actualHours,
    dueDate: payload.dueDate,
    content: payload.content,
  });
  return toTaskItem(item);
}

export async function deleteTask(id: number): Promise<void> {
  return deleteWorkItem(id);
}

export async function getTaskDetail(id: number): Promise<TaskDetail> {
  const item = await getWorkItemDetail(id);
  return toTaskItem(item) as TaskDetail;
}

export async function updateTaskDetail(payload: UpdateTaskDetailPayload): Promise<TaskItem> {
  return updateTask(payload);
}

export async function listSubtasks(taskId: number): Promise<TaskItem[]> {
  const result = await listWorkItems({
    page: 1,
    pageSize: 200,
    kind: "subtask",
    parentId: taskId,
  });
  return result.items.map(toTaskItem);
}

export async function createSubtask(payload: {
  taskId: number;
  title: string;
  owner: string;
  status?: string;
  priority?: number;
  plannedHours?: number;
}): Promise<TaskItem> {
  const item = await createWorkItem({
    kind: "subtask",
    parentId: payload.taskId,
    title: payload.title,
    owner: payload.owner,
    status: payload.status ?? "todo",
    priority: payload.priority ?? DEFAULT_WORK_ITEM_PRIORITY,
    plannedHours: payload.plannedHours ?? 0,
    actualHours: 0,
  });
  return toTaskItem(item);
}

export async function listSubtaskParents(): Promise<TaskRequirementOption[]> {
  const rows = await listParentTasks();
  return rows.map((row) => ({ id: row.id, reqId: row.itemId, title: row.title }));
}

function toTaskItem(item: WorkItem): TaskItem {
  return {
    id: item.id,
    taskId: item.itemId,
    requirementId: item.parentId ?? 0,
    title: item.title,
    status: item.status,
    priority: item.priority,
    owner: item.owner,
    plannedHours: item.plannedHours ?? 0,
    actualHours: item.actualHours ?? 0,
    dueDate: item.dueDate ?? "",
    content: item.content,
    updatedAt: item.updatedAt,
  };
}
