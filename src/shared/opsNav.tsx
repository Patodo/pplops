import { BarChart3, Handshake, Settings2, Workflow, Wrench } from "lucide-react";
import type { AppNavItem } from "@/shared/appNav";

/** 尚未迁入独立 feature 的「运营」类菜单；后续可拆到 features/workload 等。 */
export function opsNavItems(): AppNavItem[] {
  return [
    { key: "/workload", icon: <BarChart3 size={16} />, label: "工时负荷" },
    { key: "/workload/verify", icon: <Wrench size={16} />, label: "工时校验" },
    { key: "/meetings", icon: <Handshake size={16} />, label: "会议" },
    { key: "/reports", icon: <Workflow size={16} />, label: "报表" },
    { key: "/settings", icon: <Settings2 size={16} />, label: "设置" },
  ];
}
