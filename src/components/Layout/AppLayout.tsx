import type { ReactNode } from "react";
import { FieldTimeOutlined, FlagOutlined, ScheduleOutlined } from "@ant-design/icons";
import { Layout, Menu, theme } from "antd";
import {
  BarChart3,
  Gauge,
  GanttChartSquare,
  Handshake,
  KanbanSquare,
  ListChecks,
  MonitorCog,
  Settings2,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";

const { Sider, Content } = Layout;

type MenuItem = {
  key: string;
  icon?: ReactNode;
  label: string;
};

const menuItems: MenuItem[] = [
  { key: "/", icon: <Gauge size={16} />, label: "仪表盘" },
  { key: "/requirements", icon: <ListChecks size={16} />, label: "需求列表" },
  { key: "/requirements/board", icon: <KanbanSquare size={16} />, label: "需求看板" },
  { key: "/planning", icon: <FlagOutlined />, label: "计划总览" },
  { key: "/planning/month/1", icon: <ScheduleOutlined />, label: "月度计划 (示例)" },
  { key: "/planning/week/W1", icon: <FieldTimeOutlined />, label: "周任务 (示例)" },
  { key: "/planning/gantt", icon: <GanttChartSquare size={16} />, label: "甘特图" },
  { key: "/members", icon: <Users size={16} />, label: "成员" },
  { key: "/members/skills", icon: <UserRound size={16} />, label: "技能矩阵" },
  { key: "/tasks", icon: <MonitorCog size={16} />, label: "任务" },
  { key: "/workload", icon: <BarChart3 size={16} />, label: "工时负荷" },
  { key: "/workload/verify", icon: <Wrench size={16} />, label: "工时校验" },
  { key: "/meetings", icon: <Handshake size={16} />, label: "会议" },
  { key: "/reports", icon: <BarChart3 size={16} />, label: "报表" },
  { key: "/settings", icon: <Settings2 size={16} />, label: "设置" },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const path = location.pathname;
  const sorted = [...menuItems].sort((a, b) => b.key.length - a.key.length);
  const selectedKey =
    sorted.find(
      (i) =>
        path === i.key || (i.key !== "/" && path.startsWith(`${i.key}/`)),
    )?.key ?? "/";

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        className="h-screen overflow-y-auto"
      >
        <div className="h-12 flex items-center justify-center text-white font-semibold">
          {!collapsed ? "PPLOps" : "P"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((i) => ({
            key: i.key,
            icon: i.icon,
            label: i.label,
            onClick: () => navigate(i.key),
          }))}
        />
      </Sider>
      <Layout className="min-w-0 h-full overflow-hidden">
        <Content
          style={{
            margin: 16,
            padding: 16,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: "auto",
          }}
          className="min-h-0"
        >
          <div className="h-full min-h-full">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
