import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Tooltip, message } from "antd";
import type { TableProps } from "antd";
import {
  ApartmentOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  RightOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createWorkItem,
  deleteWorkItem,
  listParentProjects,
  listParentRequirements,
  listWorkItems,
} from "@/api/work-item";
import type { WorkItem, WorkItemKind, WorkItemParentOption } from "@/types/work-item";
import { ColumnSettingsModal, type CommonColumnConfig } from "@/components/Table/ColumnSettingsModal";
import { ResizableHeaderCell } from "@/components/Table/ResizableHeaderCell";

type BoardTabKey = "dashboard" | "projects" | "requirements" | "tasks";
type BoardColumnKey =
  | "itemId"
  | "title"
  | "kind"
  | "status"
  | "priority"
  | "owner"
  | "effort"
  | "planMonth"
  | "plannedHours"
  | "actualHours"
  | "dueDate"
  | "updatedAt";

type BoardRow = { key: string; item: WorkItem; depth: number };

const tabOptions: Array<{ key: BoardTabKey; label: string }> = [
  { key: "dashboard", label: "仪表盘" },
  { key: "projects", label: "项目" },
  { key: "requirements", label: "需求" },
  { key: "tasks", label: "任务" },
];

const COLUMN_CONFIG_KEY = "pplops.boards.columns";
const COLUMN_WIDTH_KEY = "pplops.boards.column-widths";

const columnTitleMap: Record<BoardColumnKey, string> = {
  itemId: "ID",
  title: "标题",
  kind: "类型",
  status: "状态",
  priority: "优先级",
  owner: "负责人",
  effort: "工作量(人天)",
  planMonth: "计划月份",
  plannedHours: "计划工时",
  actualHours: "实际工时",
  dueDate: "到期日",
  updatedAt: "更新时间",
};

const defaultColumns: CommonColumnConfig<BoardColumnKey>[] = [
  { columnKey: "itemId", visible: true, order: 0 },
  { columnKey: "title", visible: true, order: 1 },
  { columnKey: "kind", visible: true, order: 2 },
  { columnKey: "status", visible: true, order: 3 },
  { columnKey: "priority", visible: true, order: 4 },
  { columnKey: "owner", visible: true, order: 5 },
  { columnKey: "effort", visible: true, order: 6 },
  { columnKey: "planMonth", visible: true, order: 7 },
  { columnKey: "plannedHours", visible: true, order: 8 },
  { columnKey: "actualHours", visible: true, order: 9 },
  { columnKey: "dueDate", visible: true, order: 10 },
  { columnKey: "updatedAt", visible: true, order: 11 },
];

const defaultColumnWidths: Record<BoardColumnKey, number> = {
  itemId: 180,
  title: 320,
  kind: 120,
  status: 120,
  priority: 120,
  owner: 180,
  effort: 140,
  planMonth: 140,
  plannedHours: 140,
  actualHours: 140,
  dueDate: 140,
  updatedAt: 220,
};

const kindLabelMap: Record<WorkItemKind, string> = {
  project: "项目",
  requirement: "需求",
  task: "任务",
  subtask: "子任务",
};

function loadColumnsFromStorage(): CommonColumnConfig<BoardColumnKey>[] {
  try {
    const raw = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!raw) return defaultColumns;
    const parsed = JSON.parse(raw) as CommonColumnConfig<BoardColumnKey>[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

function loadColumnWidthsFromStorage(): Record<BoardColumnKey, number> {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTH_KEY);
    if (!raw) return { ...defaultColumnWidths };
    const parsed = JSON.parse(raw) as Partial<Record<BoardColumnKey, number>>;
    return {
      itemId: parsed.itemId ?? defaultColumnWidths.itemId,
      title: parsed.title ?? defaultColumnWidths.title,
      kind: parsed.kind ?? defaultColumnWidths.kind,
      status: parsed.status ?? defaultColumnWidths.status,
      priority: parsed.priority ?? defaultColumnWidths.priority,
      owner: parsed.owner ?? defaultColumnWidths.owner,
      effort: parsed.effort ?? defaultColumnWidths.effort,
      planMonth: parsed.planMonth ?? defaultColumnWidths.planMonth,
      plannedHours: parsed.plannedHours ?? defaultColumnWidths.plannedHours,
      actualHours: parsed.actualHours ?? defaultColumnWidths.actualHours,
      dueDate: parsed.dueDate ?? defaultColumnWidths.dueDate,
      updatedAt: parsed.updatedAt ?? defaultColumnWidths.updatedAt,
    };
  } catch {
    return { ...defaultColumnWidths };
  }
}

export default function BoardsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const activeKey: BoardTabKey = useMemo(() => {
    if (tab === "projects" || tab === "requirements" || tab === "tasks") return tab;
    return "dashboard";
  }, [tab]);

  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<number, WorkItem[]>>({});
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [owner, setOwner] = useState<string>();
  const [sortField, setSortField] = useState<"updatedAt" | "title" | undefined>();
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>();
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parentOptions, setParentOptions] = useState<WorkItemParentOption[]>([]);
  const [createContext, setCreateContext] = useState<{ kind: WorkItemKind; parentId?: number }>();
  const [createForm] = Form.useForm<{ title: string; owner: string; parentId?: number }>();
  const [columnConfigs, setColumnConfigs] = useState<CommonColumnConfig<BoardColumnKey>[]>(
    loadColumnsFromStorage(),
  );
  const [columnWidths, setColumnWidths] = useState<Record<BoardColumnKey, number>>(
    loadColumnWidthsFromStorage(),
  );

  const tabConfig = useMemo(() => {
    switch (activeKey) {
      case "projects":
        return { rootKind: "project" as WorkItemKind, maxDepth: 1 };
      case "requirements":
        return { rootKind: "requirement" as WorkItemKind, maxDepth: 1 };
      case "tasks":
        return { rootKind: "task" as WorkItemKind, maxDepth: 1 };
      default:
        return { rootKind: "project" as WorkItemKind, maxDepth: 3 };
    }
  }, [activeKey]);

  const getNextKind = useCallback((kind: WorkItemKind): WorkItemKind | null => {
    if (kind === "project") return "requirement";
    if (kind === "requirement") return "task";
    if (kind === "task") return "subtask";
    return null;
  }, []);

  const getDefaultStatus = useCallback((kind: WorkItemKind): string => {
    if (kind === "project") return "preparing";
    if (kind === "requirement") return "new";
    return "todo";
  }, []);

  const createKind = useMemo<WorkItemKind | null>(() => {
    if (activeKey === "projects") return "project";
    if (activeKey === "requirements") return "requirement";
    if (activeKey === "tasks") return "task";
    return null;
  }, [activeKey]);

  const createLabel = useMemo(() => {
    const kind = createContext?.kind ?? createKind;
    if (kind === "project") return "新增项目";
    if (kind === "requirement") return "新增需求";
    if (kind === "task") return "新增任务";
    if (kind === "subtask") return "新增子任务";
    return "";
  }, [createContext?.kind, createKind]);

  const fetchRootItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listWorkItems({
        page: 1,
        pageSize: 200,
        kind: tabConfig.rootKind,
        keyword: keyword || undefined,
        status,
        sortField,
        sortOrder,
      });
      setItems(result.items);
    } catch (error) {
      messageApi.error(`加载数据失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, sortField, sortOrder, status, tabConfig.rootKind]);

  useEffect(() => {
    setExpandedIds([]);
    setChildrenByParent({});
    void fetchRootItems();
  }, [fetchRootItems, activeKey]);

  useEffect(() => {
    localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  useEffect(() => {
    if (!createOpen) return;
    const kind = createContext?.kind ?? createKind;
    const fixedParentId = createContext?.parentId;
    if (!kind) return;
    const loadParents = async () => {
      try {
        if (kind === "requirement") {
          if (typeof fixedParentId === "number") return;
          setParentOptions(await listParentProjects());
          return;
        }
        if (kind === "task") {
          if (typeof fixedParentId === "number") return;
          setParentOptions(await listParentRequirements());
          return;
        }
        setParentOptions([]);
      } catch (error) {
        messageApi.error(`加载上级选项失败: ${String(error)}`);
        setParentOptions([]);
      }
    };
    void loadParents();
  }, [createContext?.kind, createContext?.parentId, createKind, createOpen, messageApi]);

  const toggleExpanded = useCallback(
    async (row: BoardRow) => {
      if (row.depth >= tabConfig.maxDepth) return;
      const nextKind = getNextKind(row.item.kind);
      if (!nextKind) return;
      const key = row.item.id;
      const expanded = expandedIds.includes(key);
      if (expanded) {
        setExpandedIds((prev) => prev.filter((id) => id !== key));
        return;
      }
      setExpandedIds((prev) => [...prev, key]);
      if (childrenByParent[key]) return;
      try {
        const result = await listWorkItems({
          page: 1,
          pageSize: 500,
          kind: nextKind,
          parentId: key,
          sortField: "updatedAt",
          sortOrder: "descend",
        });
        setChildrenByParent((prev) => ({ ...prev, [key]: result.items }));
      } catch (error) {
        messageApi.error(`加载子层级失败: ${String(error)}`);
        setChildrenByParent((prev) => ({ ...prev, [key]: [] }));
      }
    },
    [childrenByParent, expandedIds, getNextKind, messageApi, tabConfig.maxDepth],
  );

  const tableData = useMemo<BoardRow[]>(() => {
    const rows: BoardRow[] = [];
    const appendRows = (current: WorkItem[], depth: number) => {
      for (const item of current) {
        const row = { key: `${item.kind}-${item.id}`, item, depth };
        rows.push(row);
        if (expandedIds.includes(item.id) && depth < tabConfig.maxDepth) {
          appendRows(childrenByParent[item.id] ?? [], depth + 1);
        }
      }
    };
    appendRows(items, 0);
    return rows.filter((row) => !owner || row.item.owner === owner);
  }, [childrenByParent, expandedIds, items, owner, tabConfig.maxDepth]);

  const ownerOptions = useMemo(
    () => [...new Set(tableData.map((row) => row.item.owner).filter(Boolean))],
    [tableData],
  );

  const baseColumns: NonNullable<TableProps<BoardRow>["columns"]> = [
    {
      key: "expand",
      width: 48,
      render: (_: unknown, record) => {
        const expandable = record.depth < tabConfig.maxDepth && Boolean(getNextKind(record.item.kind));
        if (!expandable) return null;
        const expanded = expandedIds.includes(record.item.id);
        return (
          <Button
            type="text"
            size="small"
            icon={expanded ? <DownOutlined /> : <RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              void toggleExpanded(record);
            }}
          />
        );
      },
    },
    {
      key: "itemId",
      title: "ID",
      render: (_: unknown, record) => (
        <span style={{ paddingLeft: record.depth * 24, display: "inline-block" }}>
          {record.item.itemId}
        </span>
      ),
    },
    { key: "title", title: "标题", ellipsis: true, sorter: true, render: (_: unknown, record) => record.item.title },
    { key: "kind", title: "类型", render: (_: unknown, record) => <Tag>{kindLabelMap[record.item.kind]}</Tag> },
    { key: "status", title: "状态", render: (_: unknown, record) => <Tag>{record.item.status}</Tag> },
    { key: "priority", title: "优先级", render: (_: unknown, record) => <Tag color="orange">{record.item.priority}</Tag> },
    { key: "owner", title: "负责人", render: (_: unknown, record) => record.item.owner },
    { key: "effort", title: "工作量(人天)", render: (_: unknown, record) => record.item.effort ?? "-" },
    { key: "planMonth", title: "计划月份", render: (_: unknown, record) => record.item.planMonth ?? "-" },
    { key: "plannedHours", title: "计划工时", render: (_: unknown, record) => record.item.plannedHours ?? "-" },
    { key: "actualHours", title: "实际工时", render: (_: unknown, record) => record.item.actualHours ?? "-" },
    { key: "dueDate", title: "到期日", render: (_: unknown, record) => record.item.dueDate ?? "-" },
    {
      key: "updatedAt",
      title: "更新时间",
      sorter: true,
      render: (_: unknown, record) => new Date(record.item.updatedAt * 1000).toLocaleString(),
    },
    {
      key: "actions",
      title: "操作",
      width: 132,
      fixed: "right",
      render: (_: unknown, record) => {
        const nextKind = getNextKind(record.item.kind);
        return (
          <Space size={4}>
            <Tooltip title="分解下层">
              <Button
                type="text"
                size="small"
                icon={<ApartmentOutlined />}
                disabled={!nextKind}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!nextKind) return;
                  setCreateContext({ kind: nextKind, parentId: record.item.id });
                  createForm.setFieldsValue({
                    parentId: record.item.id,
                    title: `新建${kindLabelMap[nextKind]}`,
                    owner: record.item.owner || "未分配",
                  });
                  setCreateOpen(true);
                }}
              />
            </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                if (record.item.kind === "requirement") {
                  navigate(`/requirements/${record.item.id}`);
                  return;
                }
                if (record.item.kind === "task") {
                  navigate(`/tasks/${record.item.id}`);
                  return;
                }
                messageApi.info("该类型暂未提供独立详情页");
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  try {
                    await deleteWorkItem(record.item.id);
                    messageApi.success("删除成功");
                    setExpandedIds((prev) => prev.filter((id) => id !== record.item.id));
                    setChildrenByParent((prev) => {
                      const next: Record<number, WorkItem[]> = {};
                      for (const [parentId, children] of Object.entries(prev)) {
                        const parentKey = Number(parentId);
                        if (parentKey === record.item.id) continue;
                        next[parentKey] = children.filter((child) => child.id !== record.item.id);
                      }
                      return next;
                    });
                    void fetchRootItems();
                  } catch (error) {
                    messageApi.error(`删除失败: ${String(error)}`);
                  }
                })();
              }}
            />
          </Tooltip>
          </Space>
        );
      },
    },
  ];

  const visibleColumnKeys = useMemo(
    () =>
      [...columnConfigs]
        .sort((a, b) => a.order - b.order)
        .filter((v) => v.visible)
        .map((v) => v.columnKey),
    [columnConfigs],
  );

  const tableColumns = useMemo(() => {
    const map = new Map(baseColumns.map((col) => [String(col.key), col]));
    const ordered = visibleColumnKeys
      .map((key) => map.get(key))
      .filter((col): col is NonNullable<typeof col> => Boolean(col));
    const resized = ordered.map((col) => {
      const key = String(col.key);
      if (key === "expand") return col;
      const columnKey = key as BoardColumnKey;
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
    const actionsColumn = map.get("actions");
    return [
      baseColumns[0],
      ...resized.filter((col) => String(col.key) !== "expand" && String(col.key) !== "actions"),
      ...(actionsColumn ? [actionsColumn] : []),
    ];
  }, [baseColumns, columnWidths, visibleColumnKeys]);

  const tableScrollX = useMemo(() => {
    const visibleWidth = visibleColumnKeys.reduce((sum, key) => sum + columnWidths[key], 0);
    return visibleWidth + 80;
  }, [columnWidths, visibleColumnKeys]);

  return (
    <div>
      {contextHolder}
      <Space style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <Tabs activeKey={activeKey} onChange={(key) => navigate(`/boards?tab=${key}`)} items={tabOptions} />
        {createKind && (
          <Button
            type="primary"
            onClick={() => {
              createForm.resetFields();
              setCreateContext({ kind: createKind });
              setCreateOpen(true);
            }}
          >
            {createLabel}
          </Button>
        )}
      </Space>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Input.Search
              placeholder="搜索标题/ID/负责人"
              style={{ width: 280 }}
              allowClear
              onSearch={(value) => setKeyword(value.trim())}
            />
            <Input
              placeholder="状态筛选（输入）"
              style={{ width: 180 }}
              value={status}
              onChange={(e) => setStatus(e.target.value || undefined)}
            />
            <Select
              style={{ width: 180 }}
              placeholder="负责人筛选"
              allowClear
              value={owner}
              onChange={(value) => setOwner(value)}
              options={ownerOptions.map((value) => ({ label: value, value }))}
            />
          </Space>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setColumnDrawerOpen(true)}>
              列设置
            </Button>
            <Button onClick={() => void fetchRootItems()}>刷新</Button>
          </Space>
        </Space>
        <Table<BoardRow>
          rowKey="key"
          loading={loading}
          columns={tableColumns}
          dataSource={tableData}
          tableLayout="fixed"
          scroll={{ x: tableScrollX }}
          components={{ header: { cell: ResizableHeaderCell } }}
          pagination={false}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter) && sorter.field) {
              const field = String(sorter.field);
              if (field === "updatedAt" || field === "title") {
                setSortField(field);
                setSortOrder(sorter.order ?? undefined);
              }
            } else {
              setSortField(undefined);
              setSortOrder(undefined);
            }
          }}
          onRow={(record) => ({
            onClick: () => {
              void toggleExpanded(record);
            },
            style: { cursor: "pointer" },
          })}
        />
      </Space>
      <ColumnSettingsModal<BoardColumnKey>
        title="列设置"
        open={columnDrawerOpen}
        onClose={() => setColumnDrawerOpen(false)}
        titleMap={columnTitleMap}
        columnConfigs={columnConfigs}
        setColumnConfigs={setColumnConfigs}
        onResetDefault={() => setColumnConfigs(defaultColumns.map((item) => ({ ...item })))}
      />
      <Modal
        title={createLabel}
        open={createOpen}
        confirmLoading={creating}
        onCancel={() => {
          setCreateOpen(false);
          setCreateContext(undefined);
        }}
        onOk={() => {
          const kind = createContext?.kind ?? createKind;
          if (!kind) return;
          void (async () => {
            setCreating(true);
            try {
              const values = await createForm.validateFields();
              await createWorkItem({
                kind,
                parentId: values.parentId,
                title: values.title,
                status: getDefaultStatus(kind),
                priority: "medium",
                owner: values.owner,
                effort: kind === "requirement" ? 0 : undefined,
                planMonth: kind === "requirement" ? "" : undefined,
                plannedHours: kind === "task" || kind === "subtask" ? 0 : undefined,
                actualHours: kind === "task" || kind === "subtask" ? 0 : undefined,
                dueDate: kind === "task" || kind === "subtask" ? "" : undefined,
              });
              messageApi.success(`${createLabel}成功`);
              setCreateOpen(false);
              setCreateContext(undefined);
              void fetchRootItems();
            } catch (error) {
              messageApi.error(`创建失败: ${String(error)}`);
            } finally {
              setCreating(false);
            }
          })();
        }}
      >
        <Form form={createForm} layout="vertical">
          {((createContext?.kind ?? createKind) === "requirement" ||
            (createContext?.kind ?? createKind) === "task") &&
            typeof createContext?.parentId !== "number" && (
            <Form.Item
              label={(createContext?.kind ?? createKind) === "requirement" ? "所属项目" : "所属需求"}
              name="parentId"
              rules={[{ required: true, message: "请选择上级" }]}
            >
              <Select
                showSearch
                options={parentOptions.map((item) => ({
                  label: `${item.itemId} - ${item.title}`,
                  value: item.id,
                }))}
                placeholder="请选择"
              />
            </Form.Item>
          )}
          {typeof createContext?.parentId === "number" && (
            <Form.Item label="上级" name="parentId">
              <Input disabled />
            </Form.Item>
          )}
          <Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入标题" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="负责人" name="owner" rules={[{ required: true, message: "请输入负责人" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
