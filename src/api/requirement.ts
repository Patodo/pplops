import { invoke } from "@tauri-apps/api/core";
import {
  createWorkItem,
  deleteWorkItem,
  getWorkItemDetail,
  listParentProjects,
  listWorkItems,
  updateWorkItem,
} from "@/api/work-item";
import type { WorkItem } from "@/types/work-item";
import type {
  CreateRequirementPayload,
  RequirementDetail,
  RequirementItem,
  RequirementListQuery,
  RequirementListResult,
  UpdateRequirementDetailPayload,
  UpdateRequirementPayload,
} from "@/types/requirement";

export async function pingRequirement(): Promise<string> {
  return invoke<string>("requirement_ping");
}

export async function listRequirements(
  query: RequirementListQuery,
): Promise<RequirementListResult> {
  const result = await listWorkItems({
    page: query.page,
    pageSize: query.pageSize,
    kind: "requirement",
    parentId: query.projectId,
    keyword: query.keyword,
    status: query.status,
    priority: undefined,
    sortField: query.sortField === "updatedAt" ? "updatedAt" : undefined,
    sortOrder: query.sortOrder,
  });
  return {
    ...result,
    items: result.items.map(toRequirementItem),
  };
}

export async function listRequirementOwners(): Promise<string[]> {
  const result = await listWorkItems({
    page: 1,
    pageSize: 500,
    kind: "requirement",
  });
  return [...new Set(result.items.map((item) => item.owner).filter(Boolean))];
}

export async function createRequirement(
  payload: CreateRequirementPayload,
): Promise<RequirementItem> {
  const item = await createWorkItem({
    kind: "requirement",
    parentId: payload.projectId,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    owner: payload.owner,
    effort: payload.effort,
    planMonth: payload.planMonth,
  });
  return toRequirementItem(item);
}

export async function updateRequirement(
  payload: UpdateRequirementPayload,
): Promise<RequirementItem> {
  const item = await updateWorkItem({
    id: payload.id,
    parentId: payload.projectId,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    owner: payload.owner,
    effort: payload.effort,
    planMonth: payload.planMonth,
    content: payload.content,
  });
  return toRequirementItem(item);
}

export async function deleteRequirement(id: number): Promise<void> {
  return deleteWorkItem(id);
}

export async function getRequirementDetail(id: number): Promise<RequirementDetail> {
  const item = await getWorkItemDetail(id);
  return toRequirementItem(item) as RequirementDetail;
}

export async function updateRequirementDetail(
  payload: UpdateRequirementDetailPayload,
): Promise<RequirementItem> {
  return updateRequirement(payload);
}

export async function listRequirementProjects(): Promise<Array<{ id: number; projId: string; title: string }>> {
  const rows = await listParentProjects();
  return rows.map((row) => ({ id: row.id, projId: row.itemId, title: row.title }));
}

function toRequirementItem(item: WorkItem): RequirementItem {
  return {
    id: item.id,
    reqId: item.itemId,
    projectId: item.parentId,
    title: item.title,
    status: item.status,
    priority: item.priority,
    owner: item.owner,
    effort: item.effort ?? 0,
    planMonth: item.planMonth ?? "",
    content: item.content,
    updatedAt: item.updatedAt,
  };
}
