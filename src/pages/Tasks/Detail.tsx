import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function TaskDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`任务详情 ${id ?? ""}`}
      description="任务详情与工时记录占位。"
    />
  );
}
