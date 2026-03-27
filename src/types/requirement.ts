export type RequirementId = number;

export type RequirementStatus =
  | "preparing"
  | "new"
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RequirementPriority = "low" | "medium" | "high" | "critical";

export type RequirementItem = {
  id: number;
  reqId: string;
  projectId?: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  effort: number;
  planMonth: string;
  content?: string;
  updatedAt: number;
};

export type RequirementDetail = RequirementItem & {
  content: string;
};

export type RequirementListQuery = {
  projectId?: number;
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  owner?: string;
  sortField?: "effort" | "updatedAt" | "planMonth" | "priority";
  sortOrder?: "ascend" | "descend";
};

export type RequirementListResult = {
  items: RequirementItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateRequirementPayload = {
  projectId: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  effort: number;
  planMonth: string;
};

export type UpdateRequirementPayload = CreateRequirementPayload & {
  id: number;
  content?: string;
};

export type UpdateRequirementDetailPayload = UpdateRequirementPayload & {
  content: string;
};

export type RequirementColumnKey =
  | "reqId"
  | "title"
  | "status"
  | "priority"
  | "owner"
  | "effort"
  | "planMonth"
  | "updatedAt";

export type RequirementColumnConfig = {
  columnKey: RequirementColumnKey;
  visible: boolean;
  order: number;
};
