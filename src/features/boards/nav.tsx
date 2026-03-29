import { SquareKanban } from "lucide-react";
import type { AppNavItem } from "@/shared/appNav";

export function boardsNavItems(): AppNavItem[] {
  return [{ key: "/boards", icon: <SquareKanban size={16} />, label: "看板" }];
}
