import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, Tabs, Tag, Tooltip, Typography, message } from "antd";
import type { TableProps } from "antd";
import { ApartmentOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createWorkItem,
  deleteWorkItem,
  listParentProjects,
  listParentRequirements,
  listWorkItems,
} from "@/api/work-item";
import { DEFAULT_WORK_ITEM_PRIORITY } from "@/lib/workItemPriorityLayout";
import type { WorkItem, WorkItemKind, WorkItemParentOption } from "@/types/work-item";
import { applyColumnSortMeta, type ColumnSortSpec } from "@/components/Table/applyColumnSortMeta";
import { ColumnSettingsModal, type CommonColumnConfig } from "@/components/Table/ColumnSettingsModal";
import { HierarchicalTreeCell } from "@/components/Table/HierarchicalTreeCell";
import { mergeResizableColumns } from "@/components/Table/mergeResizableColumns";
import { PplopsDataTable } from "@/components/Table/PplopsDataTable";
import { usePersistedColumnLayout } from "@/components/Table/usePersistedColumnLayout";
import { WorkItemEditModal } from "@/components/WorkItem/WorkItemEditModal";
import { WorkItemOrchestrationModal } from "@/components/WorkItem/WorkItemOrchestrationModal";

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

type BoardRow = {
  key: string;
  item: WorkItem;
  depth: number;
  ancestorsHasNext: boolean[];
  isLastSibling: boolean;
};

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

export default function BoardsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const activeKey: BoardTabKey = useMemo(() => {
    if (tab === "projects" || tab === "requirements" || tab === "tasks") return tab;
    return "dashboard";
  }, [tab]);

  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<number, WorkItem[]>>({});
  const [selectedRowKey, setSelectedRowKey] = useState<string>();
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
  const {
    columnConfigs,
    setColumnConfigs,
    columnWidths,
    setColumnWidths,
    resetColumns,
  } = usePersistedColumnLayout<BoardColumnKey>({
    configStorageKey: COLUMN_CONFIG_KEY,
    widthStorageKey: COLUMN_WIDTH_KEY,
    defaultColumns,
    defaultWidths: defaultColumnWidths,
  });
  const [editWorkItemId, setEditWorkItemId] = useState<number | null>(null);
  const [orchOpen, setOrchOpen] = useState(false);
  const [orchContext, setOrchContext] = useState<{ id: number; title: string } | null>(null);

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

  const isRowExpandable = useCallback(
    (row: BoardRow) => {
      if (row.depth >= tabConfig.maxDepth) return false;
      if (!getNextKind(row.item.kind)) return false;
      return row.item.hasChildren ?? true;
    },
    [getNextKind, tabConfig.maxDepth],
  );

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
    setSelectedRowKey(undefined);
    void fetchRootItems();
  }, [fetchRootItems, activeKey]);

  useEffect(() => {
    const raw = searchParams.get("edit");
    if (!raw || !/^\d+$/.test(raw)) return;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return;
    setEditWorkItemId(id);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
    const appendRows = (current: WorkItem[], depth: number, ancestorsHasNext: boolean[]) => {
      for (let index = 0; index < current.length; index += 1) {
        const item = current[index];
        const isLastSibling = index === current.length - 1;
        const row: BoardRow = {
          key: `${item.kind}-${item.id}`,
          item,
          depth,
          ancestorsHasNext,
          isLastSibling,
        };
        rows.push(row);
        if (expandedIds.includes(item.id) && depth < tabConfig.maxDepth) {
          appendRows(childrenByParent[item.id] ?? [], depth + 1, [...ancestorsHasNext, !isLastSibling]);
        }
      }
    };
    appendRows(items, 0, []);
    return rows.filter((row) => !owner || row.item.owner === owner);
  }, [childrenByParent, expandedIds, items, owner, tabConfig.maxDepth]);

  const ownerOptions = useMemo(
    () => [...new Set(tableData.map((row) => row.item.owner).filter(Boolean))],
    [tableData],
  );

  const baseColumns: NonNullable<TableProps<BoardRow>["columns"]> = [
    {
      key: "itemId",
      title: "ID",
      render: (_: unknown, record) => {
        const expandable = isRowExpandable(record);
        return (
          <HierarchicalTreeCell
            rowKey={record.key}
            depth={record.depth}
            ancestorsHasNext={record.ancestorsHasNext}
            isLastSibling={record.isLastSibling}
            expandable={expandable}
            nodeVariant={record.item.kind}
            label={record.item.itemId}
          />
        );
      },
    },
    { key: "title", title: "标题", ellipsis: true, render: (_: unknown, record) => record.item.title },
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
            <Tooltip title="分解下层（编排）">
              <Button
                type="text"
                size="small"
                icon={<ApartmentOutlined />}
                disabled={!nextKind}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!nextKind) return;
                  setOrchContext({ id: record.item.id, title: record.item.title });
                  setOrchOpen(true);
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
                setEditWorkItemId(record.item.id);
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

  const boardSortSpec = useMemo<ColumnSortSpec<BoardColumnKey, BoardRow>>(
    () => ({
      title: { mode: "remote" },
      updatedAt: { mode: "remote" },
    }),
    [],
  );

  const visibleColumnKeys = useMemo(
    () =>
      [...columnConfigs]
        .sort((a, b) => a.order - b.order)
        .filter((v) => v.visible)
        .map((v) => v.columnKey),
    [columnConfigs],
  );

  const columnsWithSort = useMemo(
    () =>
      applyColumnSortMeta<BoardRow, BoardColumnKey>({
        columns: baseColumns,
        sortSpec: boardSortSpec,
        remoteSort: {
          columnKey: sortField,
          order: sortOrder,
        },
      }),
    [baseColumns, boardSortSpec, sortField, sortOrder],
  );

  const tableColumns = useMemo(
    () =>
      mergeResizableColumns<BoardRow, BoardColumnKey>({
        baseColumns: columnsWithSort,
        visibleKeys: visibleColumnKeys,
        columnWidths,
        setColumnWidths,
        pinnedRightKeys: ["actions"],
      }),
    [columnsWithSort, visibleColumnKeys, columnWidths, setColumnWidths],
  );

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
        <Typography.Text type="secondary" style={{ display: "block" }}>
          有下级为描边方块（浅填充 + 外环）；无下级为实心小圆点。单击选中，双击展开或收起。
        </Typography.Text>
        <PplopsDataTable<BoardRow, BoardColumnKey>
          rowKey="key"
          loading={loading}
          columns={tableColumns}
          dataSource={tableData}
          pagination={false}
          scrollX={tableScrollX}
          rowClassName={(record, index) => {
            const selected = record.key === selectedRowKey ? "pplops-row-selected" : "";
            const depth = `pplops-depth-${record.depth}`;
            const zebra = index % 2 === 0 ? "pplops-row-even" : "pplops-row-odd";
            const expandable = isRowExpandable(record) ? "pplops-row-expandable" : "";
            return [selected, depth, zebra, expandable].filter(Boolean).join(" ");
          }}
          rowExpandInteraction="preset"
          onSelectedRowKeyChange={setSelectedRowKey}
          onToggleExpand={toggleExpanded}
          sortSpec={boardSortSpec}
          onRemoteSort={({ columnKey, order }) => {
            setSortField(
              columnKey === "title" || columnKey === "updatedAt" ? columnKey : undefined,
            );
            setSortOrder(order);
          }}
        />
      </Space>
      <ColumnSettingsModal<BoardColumnKey>
        title="列设置"
        open={columnDrawerOpen}
        onClose={() => setColumnDrawerOpen(false)}
        titleMap={columnTitleMap}
        columnConfigs={columnConfigs}
        setColumnConfigs={setColumnConfigs}
        onResetDefault={resetColumns}
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
                priority: DEFAULT_WORK_ITEM_PRIORITY,
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
      <WorkItemEditModal
        open={editWorkItemId !== null}
        workItemId={editWorkItemId}
        onClose={() => setEditWorkItemId(null)}
        onSaved={() => void fetchRootItems()}
      />
      <WorkItemOrchestrationModal
        open={orchOpen}
        parentId={orchContext?.id ?? null}
        parentTitle={orchContext?.title ?? ""}
        onClose={() => {
          setOrchOpen(false);
          setOrchContext(null);
        }}
        onSaved={() => {
          void fetchRootItems();
          const pid = orchContext?.id;
          if (pid != null) {
            setChildrenByParent((prev) => {
              const next = { ...prev };
              delete next[pid];
              return next;
            });
          }
        }}
      />
    </div>
  );
}
