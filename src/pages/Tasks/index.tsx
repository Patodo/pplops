import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { useNavigate } from "react-router-dom";
import {
  createTask,
  deleteTask,
  listTaskRequirements,
  listTasks,
  updateTask,
} from "@/api/task";
import type {
  CreateTaskPayload,
  TaskItem,
  TaskRequirementOption,
  UpdateTaskPayload,
} from "@/types/task";

const { Title } = Typography;

const statusOptions = [
  { label: "待开始", value: "todo" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "done" },
  { label: "已取消", value: "cancelled" },
];
const priorityOptions = [
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
  { label: "紧急", value: "critical" },
];

export default function TasksListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateTaskPayload>();
  const [editingForm] = Form.useForm<UpdateTaskPayload>();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [requirements, setRequirements] = useState<TaskRequirementOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [priority, setPriority] = useState<string>();
  const [requirementId, setRequirementId] = useState<number>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<
    "plannedHours" | "actualHours" | "dueDate" | "updatedAt" | undefined
  >();
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskItem | null>(null);

  const requirementMap = useMemo(
    () => new Map(requirements.map((item) => [item.id, item])),
    [requirements],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listTasks({
        page,
        pageSize,
        keyword: keyword || undefined,
        status,
        priority,
        requirementId,
        sortField,
        sortOrder,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      messageApi.error(`加载任务失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [
    keyword,
    messageApi,
    page,
    pageSize,
    priority,
    requirementId,
    sortField,
    sortOrder,
    status,
  ]);

  const fetchRequirements = useCallback(async () => {
    try {
      const result = await listTaskRequirements();
      setRequirements(result);
    } catch {
      setRequirements([]);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  useEffect(() => {
    void fetchRequirements();
  }, [fetchRequirements]);

  const columns: TableProps<TaskItem>["columns"] = [
    { key: "taskId", dataIndex: "taskId", title: "任务ID", width: 150 },
    {
      key: "requirementId",
      dataIndex: "requirementId",
      title: "关联需求",
      width: 260,
      render: (value: number) => {
        const req = requirementMap.get(value);
        return req ? `${req.reqId} - ${req.title}` : `#${value}`;
      },
    },
    { key: "title", dataIndex: "title", title: "标题", ellipsis: true, width: 260 },
    {
      key: "status",
      dataIndex: "status",
      title: "状态",
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      key: "priority",
      dataIndex: "priority",
      title: "优先级",
      width: 110,
      render: (value: string) => <Tag color="orange">{value}</Tag>,
    },
    { key: "owner", dataIndex: "owner", title: "负责人", width: 140 },
    {
      key: "plannedHours",
      dataIndex: "plannedHours",
      title: "计划工时",
      sorter: true,
      width: 120,
    },
    {
      key: "actualHours",
      dataIndex: "actualHours",
      title: "实际工时",
      sorter: true,
      width: 120,
    },
    { key: "dueDate", dataIndex: "dueDate", title: "到期日", sorter: true, width: 130 },
    {
      key: "updatedAt",
      dataIndex: "updatedAt",
      title: "更新时间",
      sorter: true,
      width: 200,
      render: (value: number) => new Date(value * 1000).toLocaleString(),
    },
    {
      key: "actions",
      title: "操作",
      width: 110,
      fixed: "right",
      render: (_: unknown, record) => (
        <Space>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            title="编辑"
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(record);
              editingForm.setFieldsValue({
                id: record.id,
                requirementId: record.requirementId,
                title: record.title,
                status: record.status,
                priority: record.priority,
                owner: record.owner,
                plannedHours: record.plannedHours,
                actualHours: record.actualHours,
                dueDate: record.dueDate,
              });
            }}
          />
          <Popconfirm
            title="确认删除该任务？"
            onConfirm={async (e) => {
              e?.stopPropagation();
              await deleteTask(record.id);
              messageApi.success("删除成功");
              await fetchData();
            }}
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="删除"
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange: TableProps<TaskItem>["onChange"] = (pagination, _filters, sorter) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    if (!Array.isArray(sorter) && sorter.field) {
      const field = String(sorter.field);
      if (
        field === "plannedHours" ||
        field === "actualHours" ||
        field === "dueDate" ||
        field === "updatedAt"
      ) {
        setSortField(field);
        setSortOrder(sorter.order ?? undefined);
      }
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  return (
    <div>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>
            任务列表
          </Title>
          <Space>
            <Button onClick={() => navigate("/tasks/board")}>看板视图</Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新增任务
            </Button>
          </Space>
        </Space>
        <Space wrap>
          <Input.Search
            placeholder="搜索标题/任务ID/负责人"
            style={{ width: 280 }}
            allowClear
            onSearch={(value) => {
              setPage(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            style={{ width: 160 }}
            placeholder="状态筛选"
            allowClear
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
          <Select
            style={{ width: 160 }}
            placeholder="优先级筛选"
            allowClear
            options={priorityOptions}
            value={priority}
            onChange={(value) => {
              setPage(1);
              setPriority(value);
            }}
          />
          <Select
            style={{ width: 320 }}
            placeholder="需求筛选"
            allowClear
            value={requirementId}
            onChange={(value) => {
              setPage(1);
              setRequirementId(value);
            }}
            options={requirements.map((item) => ({
              label: `${item.reqId} - ${item.title}`,
              value: item.id,
            }))}
          />
          <Button onClick={() => void fetchData()}>刷新</Button>
        </Space>
        <Table<TaskItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 1650 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => navigate(`/tasks/${record.id}`),
          })}
        />
      </Space>

      <Modal
        title="新增任务"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createTask(values);
          messageApi.success("创建成功");
          setCreateOpen(false);
          form.resetFields();
          await fetchData();
        }}
      >
        <Form<CreateTaskPayload>
          layout="vertical"
          form={form}
          initialValues={{
            status: "todo",
            priority: "medium",
            owner: "未分配",
            plannedHours: 8,
            actualHours: 0,
            dueDate: "2026-12-31",
          }}
        >
          <Form.Item label="关联需求" name="requirementId" rules={[{ required: true }]}>
            <Select
              options={requirements.map((item) => ({
                label: `${item.reqId} - ${item.title}`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="优先级" name="priority" rules={[{ required: true }]}>
            <Select options={priorityOptions} />
          </Form.Item>
          <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="计划工时" name="plannedHours" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="实际工时" name="actualHours" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="到期日(YYYY-MM-DD)" name="dueDate" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑任务"
        open={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onOk={async () => {
          const values = await editingForm.validateFields();
          await updateTask(values);
          messageApi.success("更新成功");
          setEditingItem(null);
          await fetchData();
        }}
      >
        <Form<UpdateTaskPayload> layout="vertical" form={editingForm}>
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item label="关联需求" name="requirementId" rules={[{ required: true }]}>
            <Select
              options={requirements.map((item) => ({
                label: `${item.reqId} - ${item.title}`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="优先级" name="priority" rules={[{ required: true }]}>
            <Select options={priorityOptions} />
          </Form.Item>
          <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="计划工时" name="plannedHours" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="实际工时" name="actualHours" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="到期日(YYYY-MM-DD)" name="dueDate" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
