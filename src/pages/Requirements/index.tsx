import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  Checkbox,
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
import type { TableProps } from "antd";
import {
  CheckSquareOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  HolderOutlined,
  MinusSquareOutlined,
  ReloadOutlined,
  RightOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  createRequirement,
  deleteRequirement,
  listRequirementProjects,
  listRequirementOwners,
  listRequirements,
  updateRequirement,
} from "@/api/requirement";
import { createWorkItem } from "@/api/work-item";
import type {
  CreateRequirementPayload,
  RequirementColumnConfig,
  RequirementColumnKey,
  RequirementItem,
  UpdateRequirementPayload,
} from "@/types/requirement";
import { listTasks } from "@/api/task";
import type { TaskItem } from "@/types/task";

type RequirementTableRow =
  | { kind: "requirement"; requirement: RequirementItem }
  | { kind: "task"; requirement: RequirementItem; task: TaskItem };

const { Title } = Typography;
const COLUMN_CONFIG_KEY = "pplops.requirements.columns";
const COLUMN_WIDTH_KEY = "pplops.requirements.column-widths";

const statusOptions = [
  { label: "准备中", value: "preparing" },
  { label: "新建", value: "new" },
  { label: "已排期", value: "planned" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
];

const priorityOptions = [
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
  { label: "紧急", value: "critical" },
];

const columnTitleMap: Record<RequirementColumnKey, string> = {
  reqId: "需求ID",
  title: "标题",
  status: "状态",
  priority: "优先级",
  owner: "负责人",
  effort: "工作量(人天)",
  planMonth: "计划月份",
  updatedAt: "更新时间",
};

const defaultColumns: RequirementColumnConfig[] = [
  { columnKey: "reqId", visible: true, order: 0 },
  { columnKey: "title", visible: true, order: 1 },
  { columnKey: "status", visible: true, order: 2 },
  { columnKey: "priority", visible: true, order: 3 },
  { columnKey: "owner", visible: true, order: 4 },
  { columnKey: "effort", visible: true, order: 5 },
  { columnKey: "planMonth", visible: true, order: 6 },
  { columnKey: "updatedAt", visible: true, order: 7 },
];

const defaultColumnWidths: Record<RequirementColumnKey, number> = {
  reqId: 150,
  title: 320,
  status: 140,
  priority: 120,
  owner: 160,
  effort: 140,
  planMonth: 140,
  updatedAt: 200,
};

function loadColumnsFromStorage(): RequirementColumnConfig[] {
  try {
    const raw = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!raw) {
      return defaultColumns;
    }
    const parsed = JSON.parse(raw) as RequirementColumnConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultColumns;
    }
    return parsed;
  } catch {
    return defaultColumns;
  }
}

function resetToDefaultColumns(): RequirementColumnConfig[] {
  return defaultColumns.map((item) => ({ ...item }));
}

function loadColumnWidthsFromStorage(): Record<RequirementColumnKey, number> {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTH_KEY);
    if (!raw) {
      return { ...defaultColumnWidths };
    }
    const parsed = JSON.parse(raw) as Partial<Record<RequirementColumnKey, number>>;
    return {
      reqId: parsed.reqId ?? defaultColumnWidths.reqId,
      title: parsed.title ?? defaultColumnWidths.title,
      status: parsed.status ?? defaultColumnWidths.status,
      priority: parsed.priority ?? defaultColumnWidths.priority,
      owner: parsed.owner ?? defaultColumnWidths.owner,
      effort: parsed.effort ?? defaultColumnWidths.effort,
      planMonth: parsed.planMonth ?? defaultColumnWidths.planMonth,
      updatedAt: parsed.updatedAt ?? defaultColumnWidths.updatedAt,
    };
  } catch {
    return { ...defaultColumnWidths };
  }
}

function ResizableHeaderCell(
  props: React.ThHTMLAttributes<HTMLTableCellElement> & {
    onResizeStop?: (width: number) => void;
    width?: number;
  },
) {
  const { onResizeStop, width, ...restProps } = props;
  const [innerWidth, setInnerWidth] = useState<number | undefined>(width);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setInnerWidth(width);
  }, [width]);

  if (!innerWidth || !onResizeStop) {
    return <th {...restProps} />;
  }

  const handleMouseDown: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = innerWidth;
    let latestWidth = startWidth;
    setDragging(true);
    setDragDelta(0);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(80, Math.floor(startWidth + deltaX));
      latestWidth = nextWidth;
      setDragDelta(nextWidth - startWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragging(false);
      setDragDelta(0);
      onResizeStop(latestWidth);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <th
      {...restProps}
      style={{
        ...restProps.style,
        width: innerWidth,
        minWidth: innerWidth,
        maxWidth: innerWidth,
      }}
      className={[restProps.className, "resizable-header-cell"].filter(Boolean).join(" ")}
    >
      {restProps.children}
      {dragging && (
        <span
          className="resizable-ghost-line"
          style={{ transform: `translateX(${dragDelta}px)` }}
        />
      )}
      <span
        className="resizable-handle"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}

function SortableColumnItem({
  config,
  onToggleVisible,
}: {
  config: RequirementColumnConfig;
  onToggleVisible: (key: RequirementColumnKey) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: config.columnKey,
  });
  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0 } : null,
    ),
    transition,
    border: "1px solid #f0f0f0",
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 8,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  } as const;
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          type="text"
          size="small"
          icon={<HolderOutlined />}
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        />
        <Checkbox
          checked={config.visible}
          onChange={() => onToggleVisible(config.columnKey)}
        />
        <span>{columnTitleMap[config.columnKey]}</span>
      </div>
    </div>
  );
}

function ColumnBatchActions({
  allChecked,
  indeterminate,
  onToggleAll,
  onSelectAll,
  onDeselectAll,
  onResetDefault,
}: {
  allChecked: boolean;
  indeterminate: boolean;
  onToggleAll: (checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onResetDefault: () => void;
}) {
  return (
    <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
      <Checkbox
        checked={allChecked}
        indeterminate={indeterminate}
        onChange={(e) => onToggleAll(e.target.checked)}
      >
        全选
      </Checkbox>
      <Space>
        <Button size="small" icon={<CheckSquareOutlined />} onClick={onSelectAll}>
          全选
        </Button>
        <Button size="small" icon={<MinusSquareOutlined />} onClick={onDeselectAll}>
          全不选
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={onResetDefault}>
          重置默认
        </Button>
      </Space>
    </Space>
  );
}

export default function RequirementsListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateRequirementPayload>();
  const [editingForm] = Form.useForm<UpdateRequirementPayload>();
  const sensors = useSensors(useSensor(PointerSensor));

  const [items, setItems] = useState<RequirementItem[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; projId: string; title: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [owner, setOwner] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<"effort" | "updatedAt" | "planMonth" | "priority" | undefined>();
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectForm] = Form.useForm<{ title: string; owner: string }>();
  const [editingItem, setEditingItem] = useState<RequirementItem | null>(null);
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<RequirementColumnConfig[]>(
    loadColumnsFromStorage(),
  );
  const [columnWidths, setColumnWidths] = useState<Record<RequirementColumnKey, number>>(
    loadColumnWidthsFromStorage(),
  );
  const [expandedRequirementIds, setExpandedRequirementIds] = useState<number[]>([]);
  const [tasksByRequirement, setTasksByRequirement] = useState<Record<number, TaskItem[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRequirements({
        page,
        pageSize,
        keyword: keyword || undefined,
        status,
        owner,
        sortField,
        sortOrder,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      messageApi.error(`加载需求失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, owner, page, pageSize, sortField, sortOrder, status]);

  const fetchOwners = useCallback(async () => {
    try {
      const data = await listRequirementOwners();
      setOwners(data);
    } catch {
      setOwners([]);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const rows = await listRequirementProjects();
      setProjects(rows);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchOwners();
  }, [fetchOwners]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  const baseColumns = useMemo<NonNullable<TableProps<RequirementTableRow>["columns"]>>(
    () => [
      {
        key: "reqId",
        title: "ID",
        width: 130,
        render: (_: unknown, record: RequirementTableRow) => {
          if (record.kind === "requirement") {
            return record.requirement.reqId;
          }
          return (
            <span style={{ paddingLeft: 32, display: "inline-block", width: "100%", boxSizing: "border-box" }}>
              {record.task.taskId}
            </span>
          );
        },
      },
      {
        key: "title",
        title: "标题",
        ellipsis: true,
        width: 320,
        render: (_: unknown, record: RequirementTableRow) =>
          record.kind === "requirement" ? record.requirement.title : record.task.title,
      },
      {
        key: "status",
        title: "状态",
        render: (_: unknown, record: RequirementTableRow) => {
          const value = record.kind === "requirement" ? record.requirement.status : record.task.status;
          return <Tag>{value}</Tag>;
        },
      },
      {
        key: "priority",
        title: "优先级",
        sorter: true,
        render: (_: unknown, record: RequirementTableRow) => {
          const value = record.kind === "requirement" ? record.requirement.priority : record.task.priority;
          return <Tag color="orange">{value}</Tag>;
        },
      },
      {
        key: "owner",
        title: "负责人",
        width: 160,
        render: (_: unknown, record: RequirementTableRow) =>
          record.kind === "requirement" ? record.requirement.owner : record.task.owner,
      },
      {
        key: "effort",
        title: "工作量(人天)",
        sorter: true,
        render: (_: unknown, record: RequirementTableRow) =>
          record.kind === "requirement" ? record.requirement.effort : null,
      },
      {
        key: "planMonth",
        title: "计划月份",
        sorter: true,
        render: (_: unknown, record: RequirementTableRow) =>
          record.kind === "requirement" ? record.requirement.planMonth : null,
      },
      {
        key: "updatedAt",
        title: "更新时间",
        sorter: true,
        render: (_: unknown, record: RequirementTableRow) => {
          const value =
            record.kind === "requirement" ? record.requirement.updatedAt : record.task.updatedAt;
          return new Date(value * 1000).toLocaleString();
        },
      },
      {
        key: "actions",
        title: "操作",
        width: 110,
        render: (_: unknown, record: RequirementTableRow) =>
          record.kind === "requirement" ? (
            <Space>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                title="编辑"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(record.requirement);
                  editingForm.setFieldsValue({
                    id: record.requirement.id,
                  projectId: record.requirement.projectId,
                    title: record.requirement.title,
                    status: record.requirement.status,
                    priority: record.requirement.priority,
                    owner: record.requirement.owner,
                    effort: record.requirement.effort,
                    planMonth: record.requirement.planMonth,
                  });
                }}
              />
              <Popconfirm
                title="确认删除该需求？"
                onConfirm={async (e) => {
                  e?.stopPropagation();
                  await deleteRequirement(record.requirement.id);
                  messageApi.success("删除成功");
                  await fetchData();
                  await fetchOwners();
                }}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Popconfirm>
            </Space>
          ) : null,
      },
    ],
    [editingForm, fetchData, fetchOwners, messageApi],
  );

  const visibleColumnKeys = useMemo(
    () =>
      [...columnConfigs]
        .sort((a, b) => a.order - b.order)
        .filter((v) => v.visible)
        .map((v) => v.columnKey),
    [columnConfigs],
  );
  const visibleCount = visibleColumnKeys.length;
  const allChecked = visibleCount === columnConfigs.length;
  const indeterminate = visibleCount > 0 && visibleCount < columnConfigs.length;
  const tableScrollX = useMemo(() => {
    const visibleWidth = visibleColumnKeys.reduce((sum, key) => sum + columnWidths[key], 0);
    return visibleWidth + 180;
  }, [columnWidths, visibleColumnKeys]);

  const toggleExpanded = useCallback(
    async (record: RequirementItem) => {
      const key = record.id;
      const expanded = expandedRequirementIds.includes(key);
      if (expanded) {
        setExpandedRequirementIds((prev) => prev.filter((k) => k !== key));
        return;
      }
      setExpandedRequirementIds((prev) => [...prev, key]);
      if (tasksByRequirement[key]) {
        return;
      }
      try {
        const result = await listTasks({
          page: 1,
          pageSize: 200,
          requirementId: key,
        });
        setTasksByRequirement((prev) => ({ ...prev, [key]: result.items }));
      } catch (error) {
        messageApi.error(`加载关联任务失败: ${String(error)}`);
        setTasksByRequirement((prev) => ({ ...prev, [key]: [] }));
      }
    },
    [expandedRequirementIds, messageApi, tasksByRequirement],
  );

  const tableColumns = useMemo(() => {
    const map = new Map(baseColumns.map((col) => [String(col.key), col]));
    const ordered = visibleColumnKeys
      .map((key) => map.get(key))
      .filter((col): col is NonNullable<typeof col> => Boolean(col));
    const actions = map.get("actions");
    const merged = actions ? [...ordered, actions] : ordered;

    const expandColumn: NonNullable<TableProps<RequirementTableRow>["columns"]>[number] = {
      key: "expand",
      width: 48,
      fixed: "left",
      render: (_: unknown, record: RequirementTableRow) => {
        if (record.kind !== "requirement") return null;
        const expanded = expandedRequirementIds.includes(record.requirement.id);
        return (
          <Button
            type="text"
            size="small"
            icon={expanded ? <DownOutlined /> : <RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              void toggleExpanded(record.requirement);
            }}
          />
        );
      },
    };

    const restColumns = merged.map((col) => {
      const key = String(col.key);
      if (key === "actions") {
        return col;
      }
      const columnKey = key as RequirementColumnKey;
      const width = columnWidths[columnKey];
      return {
        ...col,
        width,
        onHeaderCell: () => ({
          width,
          onResizeStop: (nextWidth: number) => {
            const safeWidth = Math.max(80, Math.floor(nextWidth));
            setColumnWidths((prev) => {
              const next = { ...prev, [columnKey]: safeWidth };
              localStorage.setItem(COLUMN_WIDTH_KEY, JSON.stringify(next));
              return next;
            });
          },
        }),
      };
    });

    return [expandColumn, ...restColumns];
  }, [baseColumns, columnWidths, expandedRequirementIds, toggleExpanded, visibleColumnKeys]);

  const handleTableChange: TableProps<RequirementTableRow>["onChange"] = (
    pagination,
    _filters,
    sorter,
  ) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    if (!Array.isArray(sorter) && sorter.field) {
      const field = String(sorter.field);
      if (
        field === "effort" ||
        field === "updatedAt" ||
        field === "planMonth" ||
        field === "priority"
      ) {
        setSortField(field);
        setSortOrder(sorter.order ?? undefined);
      }
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  const tableData = useMemo<RequirementTableRow[]>(() => {
    const rows: RequirementTableRow[] = [];
    for (const req of items) {
      rows.push({ kind: "requirement", requirement: req });
      if (expandedRequirementIds.includes(req.id)) {
        const tasks = tasksByRequirement[req.id] ?? [];
        for (const task of tasks) {
          rows.push({ kind: "task", requirement: req, task });
        }
      }
    }
    return rows;
  }, [expandedRequirementIds, items, tasksByRequirement]);

  return (
    <div>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>
            需求列表
          </Title>
          <Space>
            <Button onClick={() => setCreateProjectOpen(true)}>新增项目</Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setColumnDrawerOpen(true)}
            >
              列设置
            </Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新增需求
            </Button>
          </Space>
        </Space>

        <Space wrap>
          <Input.Search
            placeholder="搜索标题/需求ID"
            style={{ width: 260 }}
            allowClear
            onSearch={(value) => {
              setPage(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            style={{ width: 180 }}
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
            style={{ width: 180 }}
            placeholder="负责人筛选"
            allowClear
            value={owner}
            onChange={(value) => {
              setPage(1);
              setOwner(value);
            }}
            options={owners.map((o) => ({ label: o, value: o }))}
          />
          <Button onClick={() => void fetchData()}>刷新</Button>
        </Space>

        <Table<RequirementTableRow>
          rowKey={(record) =>
            record.kind === "requirement"
              ? `req-${record.requirement.id}`
              : `task-${record.task.id}`
          }
          loading={loading}
          columns={tableColumns}
          tableLayout="fixed"
          scroll={{ x: tableScrollX }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          dataSource={tableData}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          onRow={(record) =>
            record.kind === "requirement"
              ? {
                  onClick: () => {
                    void toggleExpanded(record.requirement);
                  },
                  style: { cursor: "pointer" },
                }
              : {
                  onClick: () => navigate(`/tasks/${record.task.id}`),
                  style: { cursor: "pointer" },
                }
          }
        />
      </Space>

      <Modal
        title="新增项目"
        open={createProjectOpen}
        onCancel={() => setCreateProjectOpen(false)}
        onOk={async () => {
          const values = await projectForm.validateFields();
          await createWorkItem({
            kind: "project",
            title: values.title,
            owner: values.owner,
            status: "active",
            priority: "medium",
          });
          messageApi.success("项目创建成功");
          setCreateProjectOpen(false);
          projectForm.resetFields();
          await fetchProjects();
        }}
      >
        <Form form={projectForm} layout="vertical" initialValues={{ owner: "未分配" }}>
          <Form.Item label="项目名称" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增需求"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createRequirement(values);
          messageApi.success("创建成功");
          setCreateOpen(false);
          form.resetFields();
          await fetchData();
          await fetchOwners();
        }}
      >
        <Form<CreateRequirementPayload>
          layout="vertical"
          form={form}
          initialValues={{
            projectId: projects[0]?.id,
            status: "new",
            priority: "medium",
            owner: "未分配",
            effort: 1,
            planMonth: "2026-03",
          }}
        >
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}>
            <Select
              options={projects.map((p) => ({
                label: `${p.projId} - ${p.title}`,
                value: p.id,
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
          <Form.Item label="工作量(人天)" name="effort" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="计划月份(YYYY-MM)"
            name="planMonth"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑需求"
        open={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onOk={async () => {
          const values = await editingForm.validateFields();
          await updateRequirement(values);
          messageApi.success("更新成功");
          setEditingItem(null);
          await fetchData();
          await fetchOwners();
        }}
      >
        <Form<UpdateRequirementPayload> layout="vertical" form={editingForm}>
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}>
            <Select
              options={projects.map((p) => ({
                label: `${p.projId} - ${p.title}`,
                value: p.id,
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
          <Form.Item label="工作量(人天)" name="effort" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="计划月份(YYYY-MM)"
            name="planMonth"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="列设置"
        open={columnDrawerOpen}
        onCancel={() => setColumnDrawerOpen(false)}
        footer={null}
      >
        <ColumnBatchActions
          allChecked={allChecked}
          indeterminate={indeterminate}
          onToggleAll={(checked) => {
            setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: checked })));
          }}
          onSelectAll={() => {
            setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: true })));
          }}
          onDeselectAll={() => {
            setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: false })));
          }}
          onResetDefault={() => {
            setColumnConfigs(resetToDefaultColumns());
          }}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
              return;
            }
            const activeId = String(active.id) as RequirementColumnKey;
            const overId = String(over.id) as RequirementColumnKey;
            const oldIndex = columnConfigs.findIndex((c) => c.columnKey === activeId);
            const newIndex = columnConfigs.findIndex((c) => c.columnKey === overId);
            if (oldIndex === -1 || newIndex === -1) {
              return;
            }
            const next = [...columnConfigs];
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            setColumnConfigs(next.map((c, index) => ({ ...c, order: index })));
          }}
        >
          <SortableContext
            items={[...columnConfigs]
              .sort((a, b) => a.order - b.order)
              .map((v) => v.columnKey)}
            strategy={verticalListSortingStrategy}
          >
            {[...columnConfigs]
              .sort((a, b) => a.order - b.order)
              .map((config) => (
                <SortableColumnItem
                  key={config.columnKey}
                  config={config}
                  onToggleVisible={(key) => {
                    setColumnConfigs((prev) =>
                      prev.map((item) =>
                        item.columnKey === key ? { ...item, visible: !item.visible } : item,
                      ),
                    );
                  }}
                />
              ))}
          </SortableContext>
        </DndContext>
      </Modal>
    </div>
  );
}
