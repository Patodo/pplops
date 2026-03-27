import { invoke } from "@tauri-apps/api/core";
import type {
  CreateMemberPayload,
  MemberDetail,
  MemberItem,
  MemberListQuery,
  MemberListResult,
  UpdateMemberDetailPayload,
  UpdateMemberPayload,
} from "@/types/member";

export async function pingMember(): Promise<string> {
  return invoke<string>("member_ping");
}

export async function memberCount(): Promise<number> {
  return invoke<number>("member_count");
}

export async function listMembers(query: MemberListQuery): Promise<MemberListResult> {
  return invoke<MemberListResult>("list_members", { query });
}

export async function listMemberGroups(): Promise<string[]> {
  return invoke<string[]>("list_member_groups");
}

export async function createMember(payload: CreateMemberPayload): Promise<MemberItem> {
  return invoke<MemberItem>("create_member", { payload });
}

export async function updateMember(payload: UpdateMemberPayload): Promise<MemberItem> {
  return invoke<MemberItem>("update_member", { payload });
}

export async function deleteMember(id: number): Promise<void> {
  return invoke<void>("delete_member", { id });
}

export async function getMemberDetail(id: number): Promise<MemberDetail> {
  return invoke<MemberDetail>("get_member_detail", { id });
}

export async function updateMemberDetail(
  payload: UpdateMemberDetailPayload,
): Promise<MemberItem> {
  return invoke<MemberItem>("update_member", { payload });
}
