import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Col, Row, Space, Tag, Typography, message, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { listTaskRequirements, listTasks, updateTask } from "@/api/task";
import type { TaskItem, TaskRequirementOption } from "@/types/task";

const { Title, Text } = Typography;

const boardStatuses = [
  { key: "todo", title: "待开始" },
  { key: "in_progress", title: "进行中" },
  { key: "done", title: "已完成" },
  { key: "cancelled", title: "已取消" },
];

export default function TasksBoardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [requirements, setRequirements] = useState<TaskRequirementOption[]>([]);

  const reqMap = useMemo(
    () => new Map(requirements.map((item) => [item.id, item])),
    [requirements],
  );

  const fetchData = useCallback(async () => {
    try {
      const [taskResult, reqResult] = await Promise.all([
        listTasks({ page: 1, pageSize: 200 }),
        listTaskRequirements(),
      ]);
      setItems(taskResult.items);
      setRequirements(reqResult);
    } catch (error) {
      messageApi.error(`加载任务看板失败: ${String(error)}`);
    }
  }, [messageApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchData]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {contextHolder}
      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>
          任务看板
        </Title>
        <Button onClick={() => navigate("/tasks")}>列表视图</Button>
      </Space>
      <Row gutter={12} align="top">
        {boardStatuses.map((column) => {
          const columnItems = items.filter((item) => item.status === column.key);
          return (
            <Col key={column.key} span={6}>
              <Card title={`${column.title} (${columnItems.length})`} size="small">
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  {columnItems.map((item) => {
                    const req = reqMap.get(item.requirementId);
                    return (
                      <Card
                        key={item.id}
                        size="small"
                        hoverable
                        onClick={() => navigate(`/tasks/${item.id}`)}
                      >
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          <Text strong>{item.title}</Text>
                          <Text type="secondary">
                            {req ? `${req.reqId} - ${req.title}` : `需求#${item.requirementId}`}
                          </Text>
                          <Space wrap>
                            <Tag color="orange">{item.priority}</Tag>
                            <Tag>{item.owner}</Tag>
                          </Space>
                          <Space wrap>
                            {boardStatuses
                              .filter((s) => s.key !== item.status)
                              .map((target) => (
                                <Button
                                  key={target.key}
                                  size="small"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await updateTask({
                                      id: item.id,
                                      requirementId: item.requirementId,
                                      title: item.title,
                                      status: target.key,
                                      priority: item.priority,
                                      owner: item.owner,
                                      plannedHours: item.plannedHours,
                                      actualHours: item.actualHours,
                                      dueDate: item.dueDate,
                                    });
                                    messageApi.success("状态已更新");
                                    await fetchData();
                                  }}
                                >
                                  转到{target.title}
                                </Button>
                              ))}
                          </Space>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
}
