export type TaskItem = {
  id: number;
  taskId: string;
  requirementId: number;
  title: string;
  status: string;
  priority: number;
  owner: string;
  plannedHours: number;
  actualHours: number;
  dueDate: string;
  content?: string;
  updatedAt: number;
};

export type TaskDetail = TaskItem & {
  content: string;
};

export type TaskRequirementOption = {
  id: number;
  reqId: string;
  title: string;
};

export type TaskListQuery = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  priority?: number;
  requirementId?: number;
  sortField?: "plannedHours" | "actualHours" | "dueDate" | "updatedAt";
  sortOrder?: "ascend" | "descend";
};

export type TaskListResult = {
  items: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateTaskPayload = {
  requirementId: number;
  title: string;
  status: string;
  priority: number;
  owner: string;
  plannedHours: number;
  actualHours: number;
  dueDate: string;
};

export type UpdateTaskPayload = CreateTaskPayload & {
  id: number;
  content?: string;
};

export type UpdateTaskDetailPayload = UpdateTaskPayload & {
  content: string;
};
