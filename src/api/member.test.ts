import { beforeEach, describe, expect, it, vi } from "vitest";
import { TAURI_MEMBER_COMMANDS } from "@/test/domainSpec";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  createMember,
  deleteMember,
  getMemberDetail,
  listMemberGroups,
  listMembers,
  memberCount,
  pingMember,
  updateMember,
  updateMemberDetail,
} from "./member";

const sampleMember = {
  id: 1,
  memberId: "M-1",
  name: "n",
  role: "r",
  direction: "d",
  hireDate: "2020-01-01",
  workYears: 1,
  memberType: "t",
  groupName: "g",
  status: "active",
  updatedAt: 0,
};

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

describe("成员 API（与 Tauri 命令契约）", () => {
  it("pingMember 使用 member_ping", async () => {
    vi.mocked(invoke).mockResolvedValue("ok");
    await pingMember();
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.ping);
  });

  it("memberCount 使用 member_count", async () => {
    vi.mocked(invoke).mockResolvedValue(3);
    await memberCount();
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.count);
  });

  it("listMembers 使用 list_members 且载荷为 { query }", async () => {
    vi.mocked(invoke).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    const query = {
      page: 2,
      pageSize: 20,
      keyword: "张",
      groupName: "前端",
      memberType: "正式",
      status: "active",
      sortField: "name" as const,
      sortOrder: "ascend" as const,
    };
    await listMembers(query);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.list, { query });
  });

  it("listMemberGroups 使用 list_member_groups", async () => {
    vi.mocked(invoke).mockResolvedValue(["a", "b"]);
    await listMemberGroups();
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.listGroups);
  });

  it("createMember 使用 create_member 且载荷为 { payload }", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleMember);
    const payload = {
      name: "n",
      role: "r",
      direction: "d",
      hireDate: "2020-01-01",
      workYears: 2,
      memberType: "t",
      groupName: "g",
      status: "active",
    };
    await createMember(payload);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.create, { payload });
  });

  it("updateMember 使用 update_member 且载荷为 { payload }", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleMember);
    const payload = { id: 5, name: "n", role: "r", direction: "d", hireDate: "h", workYears: 1, memberType: "t", groupName: "g", status: "s" };
    await updateMember(payload);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.update, { payload });
  });

  it("deleteMember 使用 delete_member 且传入 id", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await deleteMember(8);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.delete, { id: 8 });
  });

  it("getMemberDetail 使用 get_member_detail", async () => {
    vi.mocked(invoke).mockResolvedValue({ ...sampleMember, content: "x" });
    await getMemberDetail(4);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.detail, { id: 4 });
  });

  it("updateMemberDetail 仍通过 update_member 提交完整档案", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleMember);
    const payload = {
      id: 2,
      name: "n",
      role: "r",
      direction: "d",
      hireDate: "h",
      workYears: 1,
      memberType: "t",
      groupName: "g",
      status: "s",
      content: "bio",
    };
    await updateMemberDetail(payload);
    expect(invoke).toHaveBeenCalledWith(TAURI_MEMBER_COMMANDS.update, { payload });
  });
});
