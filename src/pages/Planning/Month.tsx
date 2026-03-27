import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function MonthlyPlanPage() {
  const { month } = useParams();
  return (
    <PlaceholderPage
      title={`月度计划 ${month ?? ""}`}
      description="按月展示需求分配占位。"
    />
  );
}
