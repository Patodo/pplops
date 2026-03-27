import { invoke } from "@tauri-apps/api/core";
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
  return invoke<TaskListResult>("list_tasks", { query });
}

export async function listTaskRequirements(): Promise<TaskRequirementOption[]> {
  return invoke<TaskRequirementOption[]>("list_task_requirements");
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskItem> {
  return invoke<TaskItem>("create_task", { payload });
}

export async function updateTask(payload: UpdateTaskPayload): Promise<TaskItem> {
  return invoke<TaskItem>("update_task", { payload });
}

export async function deleteTask(id: number): Promise<void> {
  return invoke<void>("delete_task", { id });
}

export async function getTaskDetail(id: number): Promise<TaskDetail> {
  return invoke<TaskDetail>("get_task_detail", { id });
}

export async function updateTaskDetail(payload: UpdateTaskDetailPayload): Promise<TaskItem> {
  return invoke<TaskItem>("update_task", { payload });
}
