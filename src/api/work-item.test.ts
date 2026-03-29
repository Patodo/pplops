import { beforeEach, describe, expect, it, vi } from "vitest";
import { TAURI_WORK_ITEM_COMMANDS } from "@/test/domainSpec";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  createWorkItem,
  deleteWorkItem,
  getWorkItemDetail,
  listParentProjects,
  listParentRequirements,
  listParentTasks,
  listWorkItems,
  updateWorkItem,
} from "./work-item";

const sampleWorkItem = {
  id: 1,
  itemId: "P-1",
  kind: "project" as const,
  title: "t",
  status: "new",
  priority: "low",
  owner: "a",
  content: "",
  updatedAt: 0,
};

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

describe("统一工作项 API（前端与 Tauri 命令契约）", () => {
  it("listWorkItems 使用 list_work_items 且载荷为 { query }（camelCase）", async () => {
    vi.mocked(invoke).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    await listWorkItems({
      page: 2,
      pageSize: 15,
      kind: "requirement",
      parentId: 7,
      keyword: "k",
      status: "new",
      priority: "high",
      sortField: "updatedAt",
      sortOrder: "descend",
    });
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.list, {
      query: {
        page: 2,
        pageSize: 15,
        kind: "requirement",
        parentId: 7,
        keyword: "k",
        status: "new",
        priority: "high",
        sortField: "updatedAt",
        sortOrder: "descend",
      },
    });
  });

  it("getWorkItemDetail 使用 get_work_item_detail 且传入数字 id", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleWorkItem);
    await getWorkItemDetail(42);
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.detail, { id: 42 });
  });

  it("createWorkItem 使用 create_work_item 且载荷为 { payload }", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleWorkItem);
    const payload = {
      kind: "task" as const,
      parentId: 1,
      title: "x",
      status: "todo",
      priority: "medium",
      owner: "u",
    };
    await createWorkItem(payload);
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.create, { payload });
  });

  it("updateWorkItem 使用 update_work_item 且载荷为 { payload }", async () => {
    vi.mocked(invoke).mockResolvedValue(sampleWorkItem);
    const payload = { id: 9, title: "x", status: "done", priority: "low", owner: "u" };
    await updateWorkItem(payload);
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.update, { payload });
  });

  it("deleteWorkItem 使用 delete_work_item 且传入数字 id", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await deleteWorkItem(3);
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.delete, { id: 3 });
  });

  it("listParentProjects 使用 list_parent_projects 且无额外参数", async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await listParentProjects();
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.parentProjects);
  });

  it("listParentRequirements 使用 list_parent_requirements 且无额外参数", async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await listParentRequirements();
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.parentRequirements);
  });

  it("listParentTasks 使用 list_parent_tasks 且无额外参数", async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await listParentTasks();
    expect(invoke).toHaveBeenCalledWith(TAURI_WORK_ITEM_COMMANDS.parentTasks);
  });
});
