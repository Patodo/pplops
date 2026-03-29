import type { ReactNode } from "react";

/** 侧栏菜单项（由各 feature 的 nav 模块构建）。 */
export type AppNavItem = {
  key: string;
  icon?: ReactNode;
  label: string;
};
