import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function RequirementDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`需求详情 ${id ?? ""}`}
      description="需求详情与编辑占位。"
    />
  );
}
