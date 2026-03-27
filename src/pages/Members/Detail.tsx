import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function MemberDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`成员档案 ${id ?? ""}`}
      description="成员详情与技能占位。"
    />
  );
}
