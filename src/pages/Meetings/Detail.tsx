import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useParams } from "react-router-dom";

export default function MeetingDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`会议详情 ${id ?? ""}`}
      description="会议纪要占位。"
    />
  );
}
