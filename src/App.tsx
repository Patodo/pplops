import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import DashboardPage from "@/pages/Dashboard";
import RequirementsListPage from "@/pages/Requirements";
import RequirementsBoardPage from "@/pages/Requirements/Board";
import RequirementDetailPage from "@/pages/Requirements/Detail";
import PlanningOverviewPage from "@/pages/Planning";
import MonthlyPlanPage from "@/pages/Planning/Month";
import WeeklyAssignmentPage from "@/pages/Planning/Week";
import GanttChartPage from "@/pages/Planning/Gantt";
import MembersListPage from "@/pages/Members";
import MemberDetailPage from "@/pages/Members/Detail";
import SkillsMatrixPage from "@/pages/Members/Skills";
import TasksBoardPage from "@/pages/Tasks";
import TaskDetailPage from "@/pages/Tasks/Detail";
import WorkloadOverviewPage from "@/pages/Workload";
import WorkloadVerifyPage from "@/pages/Workload/Verify";
import MeetingsListPage from "@/pages/Meetings";
import MeetingDetailPage from "@/pages/Meetings/Detail";
import ReportsCenterPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="requirements" element={<RequirementsListPage />} />
            <Route path="requirements/board" element={<RequirementsBoardPage />} />
            <Route path="requirements/:id" element={<RequirementDetailPage />} />
            <Route path="planning" element={<PlanningOverviewPage />} />
            <Route path="planning/month/:month" element={<MonthlyPlanPage />} />
            <Route path="planning/week/:weekId" element={<WeeklyAssignmentPage />} />
            <Route path="planning/gantt" element={<GanttChartPage />} />
            <Route path="members" element={<MembersListPage />} />
            <Route path="members/skills" element={<SkillsMatrixPage />} />
            <Route path="members/:id" element={<MemberDetailPage />} />
            <Route path="tasks" element={<TasksBoardPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="workload" element={<WorkloadOverviewPage />} />
            <Route path="workload/verify" element={<WorkloadVerifyPage />} />
            <Route path="meetings" element={<MeetingsListPage />} />
            <Route path="meetings/:id" element={<MeetingDetailPage />} />
            <Route path="reports" element={<ReportsCenterPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
