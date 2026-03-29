import { GanttChartSquare, Workflow } from "lucide-react";
import type { AppNavItem } from "@/shared/appNav";

export function planningNavItems(): AppNavItem[] {
  return [
    { key: "/planning", icon: <Workflow size={16} />, label: "计划总览" },
    { key: "/planning/month/1", icon: <GanttChartSquare size={16} />, label: "月度计划 (示例)" },
    { key: "/planning/week/W1", icon: <GanttChartSquare size={16} />, label: "周任务 (示例)" },
    { key: "/planning/gantt", icon: <GanttChartSquare size={16} />, label: "甘特图" },
  ];
}
