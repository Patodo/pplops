import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NEW_SUBTASK } from "@/test/domainSpec";
import type { WorkItem } from "@/types/work-item";

vi.mock("@/api/work-item", () => ({
  listWorkItems: vi.fn(),
  createWorkItem: vi.fn(),
  deleteWorkItem: vi.fn(),
  getWorkItemDetail: vi.fn(),
  listParentRequirements: vi.fn(),
  listParentTasks: vi.fn(),
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
  listParentRequirements,
  listParentTasks,
  listWorkItems,
  updateWorkItem,
} from "@/api/work-item";
import {
  createSubtask,
  createTask,
  deleteTask,
  getTaskDetail,
  listSubtaskParents,
  listSubtasks,
  listTaskRequirements,
  listTasks,
  pingTask,
  updateTask,
} from "./task";

function sampleTaskWorkItem(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 2,
    itemId: "TASK-3",
    kind: "task",
    parentId: 50,
    title: "任务",
    status: "todo",
    priority: 16_384,
    owner: "wang",
    content: "",
    plannedHours: 8,
    actualHours: 2,
    dueDate: "2026-06-01",
    updatedAt: 1800000000,
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(listWorkItems).mockReset();
  vi.mocked(createWorkItem).mockReset();
  vi.mocked(updateWorkItem).mockReset();
  vi.mocked(deleteWorkItem).mockReset();
  vi.mocked(getWorkItemDetail).mockReset();
  vi.mocked(listParentRequirements).mockReset();
  vi.mocked(listParentTasks).mockReset();
  vi.mocked(invoke).mockReset();
});

describe("任务适配层（统一工作项模型上的不变量）", () => {
  it("按需求筛选任务时，应只请求 kind=task 且 parentId 为该需求", async () => {
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    await listTasks({
      page: 1,
      pageSize: 10,
      requirementId: 88,
      keyword: "api",
      status: "in_progress",
      priority: 32_768,
      sortField: "updatedAt",
      sortOrder: "ascend",
    });
    expect(listWorkItems).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      kind: "task",
      parentId: 88,
      keyword: "api",
      status: "in_progress",
      priority: 32_768,
      sortField: "updatedAt",
      sortOrder: "ascend",
    });
  });

  it("任务列表将工作项映射为任务视图：taskId、requirementId、工时与到期日缺省", async () => {
    const raw = sampleTaskWorkItem({
      parentId: undefined,
      plannedHours: undefined,
      actualHours: undefined,
      dueDate: undefined,
    });
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [raw],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    const result = await listTasks({ page: 1, pageSize: 10 });
    expect(result.items[0]).toEqual({
      id: 2,
      taskId: "TASK-3",
      requirementId: 0,
      title: "任务",
      status: "todo",
      priority: 16_384,
      owner: "wang",
      plannedHours: 0,
      actualHours: 0,
      dueDate: "",
      content: "",
      updatedAt: 1800000000,
    });
  });

  it("子任务列表限定在父任务下且分页规格固定为单页拉取", async () => {
    vi.mocked(listWorkItems).mockResolvedValue({
      items: [sampleTaskWorkItem({ kind: "subtask", itemId: "ST-1", parentId: 99 })],
      total: 1,
      page: 1,
      pageSize: 200,
    });
    await listSubtasks(99);
    expect(listWorkItems).toHaveBeenCalledWith({
      page: 1,
      pageSize: 200,
      kind: "subtask",
      parentId: 99,
    });
  });

  it("新建子任务未指定状态/优先级/计划工时时使用业务默认", async () => {
    vi.mocked(createWorkItem).mockResolvedValue(
      sampleTaskWorkItem({ kind: "subtask", itemId: "ST-2", parentId: 5 }),
    );
    await createSubtask({ taskId: 5, title: "子步", owner: "zhao" });
    expect(createWorkItem).toHaveBeenCalledWith({
      kind: "subtask",
      parentId: 5,
      title: "子步",
      owner: "zhao",
      status: DEFAULT_NEW_SUBTASK.status,
      priority: DEFAULT_NEW_SUBTASK.priority,
      plannedHours: DEFAULT_NEW_SUBTASK.plannedHours,
      actualHours: DEFAULT_NEW_SUBTASK.actualHours,
    });
  });

  it("创建任务时 requirementId 映射为工作项 parentId", async () => {
    vi.mocked(createWorkItem).mockResolvedValue(sampleTaskWorkItem());
    await createTask({
      requirementId: 12,
      title: "实现接口",
      status: "todo",
      priority: 49_152,
      owner: "u",
      plannedHours: 4,
      actualHours: 0,
      dueDate: "2026-07-01",
    });
    expect(createWorkItem).toHaveBeenCalledWith({
      kind: "task",
      parentId: 12,
      title: "实现接口",
      status: "todo",
      priority: 49_152,
      owner: "u",
      plannedHours: 4,
      actualHours: 0,
      dueDate: "2026-07-01",
    });
  });

  it("可选需求列表将 itemId 暴露为 reqId", async () => {
    vi.mocked(listParentRequirements).mockResolvedValue([
      { id: 1, itemId: "REQ-A", title: "需求A" },
    ]);
    const opts = await listTaskRequirements();
    expect(opts).toEqual([{ id: 1, reqId: "REQ-A", title: "需求A" }]);
  });

  it("子任务父级选择将任务父级映射为 reqId 字段名（与需求选项结构一致）", async () => {
    vi.mocked(listParentTasks).mockResolvedValue([
      { id: 3, itemId: "TASK-9", title: "父任务" },
    ]);
    const opts = await listSubtaskParents();
    expect(opts).toEqual([{ id: 3, reqId: "TASK-9", title: "父任务" }]);
  });

  it("删除任务委托 deleteWorkItem", async () => {
    vi.mocked(deleteWorkItem).mockResolvedValue(undefined);
    await deleteTask(7);
    expect(deleteWorkItem).toHaveBeenCalledWith(7);
  });

  it("任务详情映射包含 requirementId 与 taskId", async () => {
    vi.mocked(getWorkItemDetail).mockResolvedValue(sampleTaskWorkItem());
    const detail = await getTaskDetail(2);
    expect(detail.taskId).toBe("TASK-3");
    expect(detail.requirementId).toBe(50);
  });

  it("pingTask 走 task_ping 命令", async () => {
    vi.mocked(invoke).mockResolvedValue("pong");
    await pingTask();
    expect(invoke).toHaveBeenCalledWith("task_ping");
  });

  it("更新任务时写入内容与工时、到期日", async () => {
    vi.mocked(updateWorkItem).mockResolvedValue(sampleTaskWorkItem());
    await updateTask({
      id: 1,
      requirementId: 9,
      title: "t",
      status: "done",
      priority: 32_768,
      owner: "o",
      plannedHours: 1,
      actualHours: 1,
      dueDate: "2026-01-02",
      content: "c",
    });
    expect(updateWorkItem).toHaveBeenCalledWith({
      id: 1,
      parentId: 9,
      title: "t",
      status: "done",
      priority: 32_768,
      owner: "o",
      plannedHours: 1,
      actualHours: 1,
      dueDate: "2026-01-02",
      content: "c",
    });
  });
});
