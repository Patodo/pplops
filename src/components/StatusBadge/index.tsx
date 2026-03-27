import { Tag } from "antd";

type Props = { label: string; color?: string };

export function StatusBadge({ label, color }: Props) {
  return <Tag color={color}>{label}</Tag>;
}
