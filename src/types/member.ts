export type MemberItem = {
  id: number;
  memberId: string;
  name: string;
  role: string;
  direction: string;
  hireDate: string;
  workYears: number;
  memberType: string;
  groupName: string;
  status: string;
  content?: string;
  updatedAt: number;
};

export type MemberDetail = MemberItem & {
  content: string;
};

export type MemberListQuery = {
  page: number;
  pageSize: number;
  keyword?: string;
  groupName?: string;
  memberType?: string;
  status?: string;
  sortField?: "name" | "workYears" | "updatedAt";
  sortOrder?: "ascend" | "descend";
};

export type MemberListResult = {
  items: MemberItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateMemberPayload = {
  name: string;
  role: string;
  direction: string;
  hireDate: string;
  workYears: number;
  memberType: string;
  groupName: string;
  status: string;
};

export type UpdateMemberPayload = CreateMemberPayload & {
  id: number;
  content?: string;
};

export type UpdateMemberDetailPayload = UpdateMemberPayload & {
  content: string;
};
/** 成员相关类型占位 */
