import type { ReactNode } from "react";
import { Layout, Menu, theme } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";

const { Header, Sider, Content } = Layout;

type MenuItem = {
  key: string;
  icon?: ReactNode;
  label: string;
};

const menuItems: MenuItem[] = [
  { key: "/", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/requirements", icon: <UnorderedListOutlined />, label: "需求列表" },
  { key: "/requirements/board", icon: <AppstoreOutlined />, label: "需求看板" },
  { key: "/planning", icon: <CalendarOutlined />, label: "计划总览" },
  { key: "/planning/month/1", icon: <CalendarOutlined />, label: "月度计划 (示例)" },
  { key: "/planning/week/W1", icon: <CalendarOutlined />, label: "周任务 (示例)" },
  { key: "/planning/gantt", icon: <BarChartOutlined />, label: "甘特图" },
  { key: "/members", icon: <TeamOutlined />, label: "成员" },
  { key: "/members/skills", icon: <TeamOutlined />, label: "技能矩阵" },
  { key: "/tasks", icon: <UnorderedListOutlined />, label: "任务" },
  { key: "/workload", icon: <BarChartOutlined />, label: "工时负荷" },
  { key: "/workload/verify", icon: <BarChartOutlined />, label: "工时校验" },
  { key: "/meetings", icon: <FileTextOutlined />, label: "会议" },
  { key: "/reports", icon: <FileTextOutlined />, label: "报表" },
  { key: "/settings", icon: <SettingOutlined />, label: "设置" },
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
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
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
      <Layout>
        <Header style={{ background: colorBgContainer, padding: "0 24px" }}>
          <span className="font-medium">PPLOps</span>
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 0,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
