import { invoke } from "@tauri-apps/api/core";
import type {
  CreateWorkItemPayload,
  SaveWorkItemOrchestrationPayload,
  UpdateWorkItemPayload,
  WorkItem,
  WorkItemListQuery,
  WorkItemListResult,
  WorkItemOrchestration,
  WorkItemParentOption,
} from "./types";

export async function listWorkItems(query: WorkItemListQuery): Promise<WorkItemListResult> {
  return invoke<WorkItemListResult>("list_work_items", { query });
}

export async function getWorkItemDetail(id: number): Promise<WorkItem> {
  return invoke<WorkItem>("get_work_item_detail", { id });
}

export async function createWorkItem(payload: CreateWorkItemPayload): Promise<WorkItem> {
  return invoke<WorkItem>("create_work_item", { payload });
}

export async function updateWorkItem(payload: UpdateWorkItemPayload): Promise<WorkItem> {
  return invoke<WorkItem>("update_work_item", { payload });
}

export async function deleteWorkItem(id: number): Promise<void> {
  return invoke<void>("delete_work_item", { id });
}

export async function listParentProjects(): Promise<WorkItemParentOption[]> {
  return invoke<WorkItemParentOption[]>("list_parent_projects");
}

export async function listParentRequirements(): Promise<WorkItemParentOption[]> {
  return invoke<WorkItemParentOption[]>("list_parent_requirements");
}

export async function listParentTasks(): Promise<WorkItemParentOption[]> {
  return invoke<WorkItemParentOption[]>("list_parent_tasks");
}

export async function getWorkItemOrchestration(parentId: number): Promise<WorkItemOrchestration> {
  return invoke<WorkItemOrchestration>("get_work_item_orchestration", { parentId });
}

export async function saveWorkItemOrchestration(
  payload: SaveWorkItemOrchestrationPayload,
): Promise<void> {
  return invoke<void>("save_work_item_orchestration", { payload });
}
