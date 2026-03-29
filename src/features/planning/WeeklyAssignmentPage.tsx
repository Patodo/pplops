import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function WeeklyAssignmentPage() {
  const { weekId } = useParams();
  return (
    <PlaceholderPage
      title={`周任务分配 ${weekId ?? ""}`}
      description="周级任务与人天分配表占位。"
    />
  );
}
