import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkItem } from "@/shared/work-item";

vi.mock("@/shared/work-item", () => ({
  listWorkItems: vi.fn(),
  createWorkItem: vi.fn(),
  deleteWorkItem: vi.fn(),
  getWorkItemDetail: vi.fn(),
  listParentProjects: vi.fn(),
  updateWorkItem: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  createWorkItem,
  deleteWorkItem,
  getWorkItemDetail,
  listParentProjects,
  listWorkItems,
  updateWorkItem,
} from "@/shared/work-item";
import {
  createRequirement,
  deleteRequirement,
  getRequirementDetail,
  listRequirementOwners,
  listRequirementProjects,
  listRequirements,
  pingRequirement,
  updateRequirement,
} from "./requirement";

function sampleRequirementWorkItem(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 1,
    itemId: "REQ-7",
    kind: "requirement",
    parentId: 100,
    title: "需求标题",
    status: "new",
    priority: 32_768,
    owner: "zhang",
    content: "正文",
    effort: 3,
    planMonth: "2026-04",
    updatedAt: 1700000000,
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(listWorkItems).mockReset();
  vi.mocked(createWorkItem).mockReset();
  vi.mocked(updateWorkItem).mockReset();
  vi.mocked(deleteWorkItem).mockReset();
  vi.mocked(getWorkItemDetail).mockReset();
  vi.mocked(listParentProjects).mockReset();
  vi.mocked(invoke).mockReset();
});

describe("需求适配层（统一工作项模型上的不变量）", () => {
  it("按项目筛选需求时，应只请求 kind=requirement 且 parentId 为该项目", async () => {
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await listRequirements({
      page: 1,
      pageSize: 20,
      projectId: 55,
      keyword: "登录",
      status: "in_progress",
      sortField: "updatedAt",
      sortOrder: "descend",
    });
    expect(listWorkItems).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      kind: "requirement",
      parentId: 55,
      keyword: "登录",
      status: "in_progress",
      priority: undefined,
      sortField: "updatedAt",
      sortOrder: "descend",
    });
  });

  it("统一列表仅转发 updatedAt 排序；其它列排序不传给工作项层", async () => {
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    await listRequirements({
      page: 1,
      pageSize: 10,
      sortField: "effort",
      sortOrder: "ascend",
    });
    expect(listWorkItems).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: undefined,
        sortOrder: "ascend",
      }),
    );
  });

  it("列表结果将工作项映射为需求视图：reqId、projectId、effort/planMonth 缺省规则", async () => {
    const raw = sampleRequirementWorkItem({
      effort: undefined,
      planMonth: undefined,
      parentId: undefined,
    });
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [raw],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const result = await listRequirements({ page: 1, pageSize: 20 });
    expect(result.items[0]).toEqual({
      id: 1,
      reqId: "REQ-7",
      projectId: undefined,
      title: "需求标题",
      status: "new",
      priority: 32_768,
      owner: "zhang",
      effort: 0,
      planMonth: "",
      content: "正文",
      updatedAt: 1700000000,
    });
  });

  it("需求负责人列表为全部需求上的负责人去重且不含空串", async () => {
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [
        sampleRequirementWorkItem({ id: 1, owner: "a" }),
        sampleRequirementWorkItem({ id: 2, owner: "" }),
        sampleRequirementWorkItem({ id: 3, owner: "a" }),
        sampleRequirementWorkItem({ id: 4, owner: "b" }),
      ],
      total: 4,
      page: 1,
      pageSize: 500,
    });
    const owners = await listRequirementOwners();
    expect(listWorkItems).toHaveBeenCalledWith({
      page: 1,
      pageSize: 500,
      kind: "requirement",
    });
    expect(owners).toEqual(["a", "b"]);
  });

  it("创建需求时 parentId 对应项目、类型为 requirement", async () => {
    vi.mocked(createWorkItem).mockResolvedValue(sampleRequirementWorkItem());
    await createRequirement({
      projectId: 12,
      title: "新需求",
      status: "new",
      priority: 16_384,
      owner: "li",
      effort: 2,
      planMonth: "2026-05",
    });
    expect(createWorkItem).toHaveBeenCalledWith({
      kind: "requirement",
      parentId: 12,
      title: "新需求",
      status: "new",
      priority: 16_384,
      owner: "li",
      effort: 2,
      planMonth: "2026-05",
    });
  });

  it("更新需求时携带内容与父子关系字段", async () => {
    vi.mocked(updateWorkItem).mockResolvedValue(sampleRequirementWorkItem());
    await updateRequirement({
      id: 9,
      projectId: 2,
      title: "t",
      status: "planned",
      priority: 49_152,
      owner: "u",
      effort: 1,
      planMonth: "2026-01",
      content: "md",
    });
    expect(updateWorkItem).toHaveBeenCalledWith({
      id: 9,
      parentId: 2,
      title: "t",
      status: "planned",
      priority: 49_152,
      owner: "u",
      effort: 1,
      planMonth: "2026-01",
      content: "md",
    });
  });

  it("删除需求委托 deleteWorkItem", async () => {
    vi.mocked(deleteWorkItem).mockResolvedValue(undefined);
    await deleteRequirement(44);
    expect(deleteWorkItem).toHaveBeenCalledWith(44);
  });

  it("需求详情由工作项详情映射为需求视图", async () => {
    vi.mocked(getWorkItemDetail).mockResolvedValue(sampleRequirementWorkItem());
    const detail = await getRequirementDetail(1);
    expect(detail.reqId).toBe("REQ-7");
    expect(detail.projectId).toBe(100);
    expect(detail.content).toBe("正文");
  });

  it("可选项目列表将 itemId 暴露为 projId 供界面使用", async () => {
    vi.mocked(listParentProjects).mockResolvedValue([
      { id: 1, itemId: "PROJ-1", title: "项目甲" },
      { id: 2, itemId: "PROJ-2", title: "项目乙" },
    ]);
    const rows = await listRequirementProjects();
    expect(rows).toEqual([
      { id: 1, projId: "PROJ-1", title: "项目甲" },
      { id: 2, projId: "PROJ-2", title: "项目乙" },
    ]);
  });

  it("pingRequirement 走 requirement_ping 命令", async () => {
    vi.mocked(invoke).mockResolvedValue("pong");
    await pingRequirement();
    expect(invoke).toHaveBeenCalledWith("requirement_ping");
  });
});
