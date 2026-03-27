import { Card, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { getAppInfo } from "@/api/app";
import { memberCount } from "@/api/member";

export default function DashboardPage() {
  const [info, setInfo] = useState<string>("");
  const [members, setMembers] = useState<string>("");

  useEffect(() => {
    getAppInfo()
      .then((r) => setInfo(`${r.name} v${r.version}`))
      .catch(() => setInfo("（后端未就绪）"));
    memberCount()
      .then((n) => setMembers(String(n)))
      .catch(() => setMembers("—"));
  }, []);

  return (
    <div className="p-6">
      <Typography.Title level={3}>仪表盘</Typography.Title>
      <Space direction="vertical" className="w-full mt-4">
        <Card title="应用">
          <Typography.Text>{info || "加载中…"}</Typography.Text>
        </Card>
        <Card title="成员表行数（SQLite / member）">
          <Typography.Text>{members || "加载中…"}</Typography.Text>
        </Card>
        <Card title="说明">需求管道、工时负荷等图表占位，后续迭代接入。</Card>
      </Space>
    </div>
  );
}
