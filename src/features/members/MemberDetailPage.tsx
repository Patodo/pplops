import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MemberDetailModal } from "@/components/Member/MemberDetailModal";

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = Number(id);
  const valid = Number.isInteger(memberId) && memberId > 0;

  if (!valid) {
    return <Navigate to="/members" replace />;
  }

  return (
    <MemberDetailModal
      open
      memberId={memberId}
      onClose={() => navigate("/members", { replace: true })}
    />
  );
}
