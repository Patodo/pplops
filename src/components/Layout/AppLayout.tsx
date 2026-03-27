import type { ReactNode } from "react";
import { Layout, Menu, theme } from "antd";
import {
  BarChart3,
  GanttChartSquare,
  Handshake,
  ListChecks,
  Settings2,
  SquareKanban,
  UserRound,
  Users,
  Workflow,
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

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuItems: MenuItem[] = [
  { key: "/boards", icon: <SquareKanban size={16} />, label: "看板" },
  { key: "/planning", icon: <Workflow size={16} />, label: "计划总览" },
  { key: "/planning/month/1", icon: <GanttChartSquare size={16} />, label: "月度计划 (示例)" },
  { key: "/planning/week/W1", icon: <GanttChartSquare size={16} />, label: "周任务 (示例)" },
  { key: "/planning/gantt", icon: <GanttChartSquare size={16} />, label: "甘特图" },
  { key: "/members", icon: <Users size={16} />, label: "成员" },
  { key: "/members/skills", icon: <UserRound size={16} />, label: "技能矩阵" },
  { key: "/workload", icon: <BarChart3 size={16} />, label: "工时负荷" },
  { key: "/workload/verify", icon: <Wrench size={16} />, label: "工时校验" },
  { key: "/meetings", icon: <Handshake size={16} />, label: "会议" },
  { key: "/reports", icon: <Workflow size={16} />, label: "报表" },
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

  const menuSections: MenuSection[] = [
    {
      title: "核心看板",
      items: menuItems.slice(0, 1),
    },
    {
      title: "规划与成员",
      items: menuItems.slice(1, 7),
    },
    {
      title: "运营管理",
      items: menuItems.slice(7),
    },
  ];

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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuSections.flatMap((section, index) => [
            {
              key: `section-${index}`,
              type: "group" as const,
              label: collapsed ? "" : section.title,
              children: section.items.map((i) => ({
                key: i.key,
                icon: i.icon,
                label: i.label,
                onClick: () => navigate(i.key),
              })),
            },
            ...(index < menuSections.length - 1 ? [{ type: "divider" as const }] : []),
          ])}
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
