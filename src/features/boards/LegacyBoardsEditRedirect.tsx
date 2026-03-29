import { Navigate, useParams } from "react-router-dom";

export function LegacyBoardsEditRedirect({ tab }: { tab: "requirements" | "tasks" }) {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) {
    return <Navigate to={`/boards?tab=${tab}`} replace />;
  }
  return <Navigate to={`/boards?tab=${tab}&edit=${id}`} replace />;
}
