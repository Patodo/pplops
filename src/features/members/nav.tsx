import { UserRound, Users } from "lucide-react";
import type { AppNavItem } from "@/shared/appNav";

export function membersNavItems(): AppNavItem[] {
  return [
    { key: "/members", icon: <Users size={16} />, label: "成员" },
    { key: "/members/skills", icon: <UserRound size={16} />, label: "技能矩阵" },
  ];
}
