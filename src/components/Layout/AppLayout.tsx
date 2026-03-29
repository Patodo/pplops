import type { ReactNode } from "react";
import { Layout, Menu, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { boardsNavItems } from "@/features/boards/nav";
import { membersNavItems } from "@/features/members/nav";
import { planningNavItems } from "@/features/planning/nav";
import type { AppNavItem } from "@/shared/appNav";
import { opsNavItems } from "@/shared/opsNav";
import { useAppStore } from "@/stores/appStore";

const { Sider, Content } = Layout;

type MenuSection = {
  title: string;
  items: AppNavItem[];
};

function flattenNavForSelection(sections: MenuSection[]): AppNavItem[] {
  return sections.flatMap((s) => s.items);
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuSections: MenuSection[] = [
    { title: "核心看板", items: boardsNavItems() },
    { title: "规划与成员", items: [...planningNavItems(), ...membersNavItems()] },
    { title: "运营管理", items: opsNavItems() },
  ];

  const allItems = flattenNavForSelection(menuSections);
  const path = location.pathname;
  const sorted = [...allItems].sort((a, b) => b.key.length - a.key.length);
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
                icon: i.icon as ReactNode,
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
