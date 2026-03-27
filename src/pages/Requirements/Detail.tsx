import { Button, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useNavigate, useParams } from "react-router-dom";

export default function RequirementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/requirements")}
        style={{ width: "fit-content" }}
      >
        返回需求列表
      </Button>
      <PlaceholderPage
        title={`需求详情 ${id ?? ""}`}
        description="需求详情与编辑占位。"
      />
    </Space>
  );
}
