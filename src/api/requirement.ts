import { invoke } from "@tauri-apps/api/core";
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
  return invoke<RequirementListResult>("list_requirements", { query });
}

export async function listRequirementOwners(): Promise<string[]> {
  return invoke<string[]>("list_requirement_owners");
}

export async function createRequirement(
  payload: CreateRequirementPayload,
): Promise<RequirementItem> {
  return invoke<RequirementItem>("create_requirement", { payload });
}

export async function updateRequirement(
  payload: UpdateRequirementPayload,
): Promise<RequirementItem> {
  return invoke<RequirementItem>("update_requirement", { payload });
}

export async function deleteRequirement(id: number): Promise<void> {
  return invoke<void>("delete_requirement", { id });
}

export async function getRequirementDetail(id: number): Promise<RequirementDetail> {
  return invoke<RequirementDetail>("get_requirement_detail", { id });
}

export async function updateRequirementDetail(
  payload: UpdateRequirementDetailPayload,
): Promise<RequirementItem> {
  return invoke<RequirementItem>("update_requirement", { payload });
}
