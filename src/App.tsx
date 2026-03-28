import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import BoardsPage from "@/pages/Boards";
import PlanningOverviewPage from "@/pages/Planning";
import MonthlyPlanPage from "@/pages/Planning/Month";
import WeeklyAssignmentPage from "@/pages/Planning/Week";
import GanttChartPage from "@/pages/Planning/Gantt";
import MembersListPage from "@/pages/Members";
import MemberDetailPage from "@/pages/Members/Detail";
import SkillsMatrixPage from "@/pages/Members/Skills";
import WorkloadOverviewPage from "@/pages/Workload";
import WorkloadVerifyPage from "@/pages/Workload/Verify";
import MeetingsListPage from "@/pages/Meetings";
import MeetingDetailPage from "@/pages/Meetings/Detail";
import ReportsCenterPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";

function LegacyBoardsEditRedirect({ tab }: { tab: "requirements" | "tasks" }) {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) {
    return <Navigate to={`/boards?tab=${tab}`} replace />;
  }
  return <Navigate to={`/boards?tab=${tab}&edit=${id}`} replace />;
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/boards" replace />} />
            <Route path="boards" element={<BoardsPage />} />
            <Route path="requirements/:id" element={<LegacyBoardsEditRedirect tab="requirements" />} />
            <Route path="planning" element={<PlanningOverviewPage />} />
            <Route path="planning/month/:month" element={<MonthlyPlanPage />} />
            <Route path="planning/week/:weekId" element={<WeeklyAssignmentPage />} />
            <Route path="planning/gantt" element={<GanttChartPage />} />
            <Route path="members" element={<MembersListPage />} />
            <Route path="members/skills" element={<SkillsMatrixPage />} />
            <Route path="members/:id" element={<MemberDetailPage />} />
            <Route path="tasks/:id" element={<LegacyBoardsEditRedirect tab="tasks" />} />
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
