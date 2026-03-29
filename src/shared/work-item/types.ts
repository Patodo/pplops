export type WorkItemKind = "project" | "requirement" | "task" | "subtask";

export type WorkItem = {
  id: number;
  itemId: string;
  kind: WorkItemKind;
  parentId?: number;
  hasChildren?: boolean;
  title: string;
  status: string;
  priority: number;
  owner: string;
  content: string;
  effort?: number;
  planMonth?: string;
  plannedHours?: number;
  actualHours?: number;
  dueDate?: string;
  updatedAt: number;
};

export type WorkItemListQuery = {
  page: number;
  pageSize: number;
  kind?: WorkItemKind;
  parentId?: number;
  keyword?: string;
  status?: string;
  priority?: number;
  sortField?: "updatedAt" | "title" | "priority";
  sortOrder?: "ascend" | "descend";
};

export type WorkItemListResult = {
  items: WorkItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateWorkItemPayload = {
  kind: WorkItemKind;
  parentId?: number;
  title: string;
  status: string;
  priority: number;
  owner: string;
  content?: string;
  effort?: number;
  planMonth?: string;
  plannedHours?: number;
  actualHours?: number;
  dueDate?: string;
};

export type UpdateWorkItemPayload = Omit<CreateWorkItemPayload, "kind"> & {
  id: number;
};

export type WorkItemParentOption = {
  id: number;
  itemId: string;
  title: string;
};

export type WorkItemDependencyEdge = {
  predecessorId: number;
  successorId: number;
};

export type WorkItemOrchestration = {
  items: WorkItem[];
  dependencies: WorkItemDependencyEdge[];
};

export type SaveWorkItemOrchestrationPayload = {
  parentId: number;
  items: Array<{ id: number; priority: number }>;
  dependencies: WorkItemDependencyEdge[];
};
