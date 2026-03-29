import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import { BoardsPage, LegacyBoardsEditRedirect } from "@/features/boards";
import {
  GanttChartPage,
  MonthlyPlanPage,
  PlanningOverviewPage,
  WeeklyAssignmentPage,
} from "@/features/planning";
import {
  MemberDetailPage,
  MembersListPage,
  SkillsMatrixPage,
} from "@/features/members";
import MeetingsListPage from "@/pages/Meetings";
import MeetingDetailPage from "@/pages/Meetings/Detail";
import ReportsCenterPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import WorkloadOverviewPage from "@/pages/Workload";
import WorkloadVerifyPage from "@/pages/Workload/Verify";

/** 单个业务 feature 的 Route 片段定义。 */
export type FeatureRouteDescriptor = {
  /** feature 唯一 id（boards / members / planning / ops 等） */
  id: string;
  /** 渲染在 `<Route path=\"/\" element={<AppLayout />}>` 下的子路由片段。 */
  renderRoutes: () => ReactNode;
};

export const featureRouteDescriptors: FeatureRouteDescriptor[] = [
  {
    id: "boards",
    renderRoutes: () => (
      <>
        <Route path="boards" element={<BoardsPage />} />
        <Route path="requirements/:id" element={<LegacyBoardsEditRedirect tab="requirements" />} />
        <Route path="tasks/:id" element={<LegacyBoardsEditRedirect tab="tasks" />} />
      </>
    ),
  },
  {
    id: "planning",
    renderRoutes: () => (
      <>
        <Route path="planning" element={<PlanningOverviewPage />} />
        <Route path="planning/month/:month" element={<MonthlyPlanPage />} />
        <Route path="planning/week/:weekId" element={<WeeklyAssignmentPage />} />
        <Route path="planning/gantt" element={<GanttChartPage />} />
      </>
    ),
  },
  {
    id: "members",
    renderRoutes: () => (
      <>
        <Route path="members" element={<MembersListPage />} />
        <Route path="members/skills" element={<SkillsMatrixPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
      </>
    ),
  },
  {
    id: "ops",
    renderRoutes: () => (
      <>
        <Route path="workload" element={<WorkloadOverviewPage />} />
        <Route path="workload/verify" element={<WorkloadVerifyPage />} />
        <Route path="meetings" element={<MeetingsListPage />} />
        <Route path="meetings/:id" element={<MeetingDetailPage />} />
        <Route path="reports" element={<ReportsCenterPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </>
    ),
  },
];

