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
import { useNavigate } from "react-router-dom";
import {
  CheckSquareOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  MinusSquareOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  createMember,
  deleteMember,
  listMemberGroups,
  listMembers,
  updateMember,
} from "@/api/member";
import type {
  CreateMemberPayload,
  MemberItem,
  UpdateMemberPayload,
} from "@/types/member";

const { Title } = Typography;
const COLUMN_CONFIG_KEY = "pplops.members.columns";
const COLUMN_WIDTH_KEY = "pplops.members.column-widths";
type MemberColumnKey =
  | "memberId"
  | "name"
  | "role"
  | "direction"
  | "memberType"
  | "groupName"
  | "status"
  | "workYears"
  | "updatedAt";
type MemberColumnConfig = { columnKey: MemberColumnKey; visible: boolean; order: number };

const memberTypeOptions = [
  { label: "自有员工", value: "employee" },
  { label: "外包", value: "outsource" },
];

const statusOptions = [
  { label: "在岗", value: "active" },
  { label: "休假", value: "leave" },
  { label: "离岗", value: "inactive" },
];

const columnTitleMap: Record<MemberColumnKey, string> = {
  memberId: "成员ID",
  name: "姓名",
  role: "角色/职位",
  direction: "开发方向",
  memberType: "成员类型",
  groupName: "所属小组",
  status: "状态",
  workYears: "工作年限",
  updatedAt: "更新时间",
};

const defaultColumns: MemberColumnConfig[] = [
  { columnKey: "memberId", visible: true, order: 0 },
  { columnKey: "name", visible: true, order: 1 },
  { columnKey: "role", visible: true, order: 2 },
  { columnKey: "direction", visible: true, order: 3 },
  { columnKey: "memberType", visible: true, order: 4 },
  { columnKey: "groupName", visible: true, order: 5 },
  { columnKey: "status", visible: true, order: 6 },
  { columnKey: "workYears", visible: true, order: 7 },
  { columnKey: "updatedAt", visible: true, order: 8 },
];

const defaultColumnWidths: Record<MemberColumnKey, number> = {
  memberId: 150,
  name: 140,
  role: 180,
  direction: 120,
  memberType: 120,
  groupName: 140,
  status: 110,
  workYears: 120,
  updatedAt: 200,
};

function loadColumnsFromStorage(): MemberColumnConfig[] {
  try {
    const raw = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!raw) return defaultColumns;
    const parsed = JSON.parse(raw) as MemberColumnConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultColumns;
    return parsed;
  } catch {
    return defaultColumns;
  }
}

function loadColumnWidthsFromStorage(): Record<MemberColumnKey, number> {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTH_KEY);
    if (!raw) return { ...defaultColumnWidths };
    const parsed = JSON.parse(raw) as Partial<Record<MemberColumnKey, number>>;
    return {
      memberId: parsed.memberId ?? defaultColumnWidths.memberId,
      name: parsed.name ?? defaultColumnWidths.name,
      role: parsed.role ?? defaultColumnWidths.role,
      direction: parsed.direction ?? defaultColumnWidths.direction,
      memberType: parsed.memberType ?? defaultColumnWidths.memberType,
      groupName: parsed.groupName ?? defaultColumnWidths.groupName,
      status: parsed.status ?? defaultColumnWidths.status,
      workYears: parsed.workYears ?? defaultColumnWidths.workYears,
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
  const [dragDelta, setDragDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  if (!width || !onResizeStop) return <th {...restProps} />;

  const handleMouseDown: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = width;
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
        width,
        minWidth: width,
        maxWidth: width,
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
  config: MemberColumnConfig;
  onToggleVisible: (key: MemberColumnKey) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: config.columnKey,
  });
  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
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
        <Checkbox checked={config.visible} onChange={() => onToggleVisible(config.columnKey)} />
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

export default function MembersListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateMemberPayload>();
  const [editingForm] = Form.useForm<UpdateMemberPayload>();
  const sensors = useSensors(useSensor(PointerSensor));

  const [items, setItems] = useState<MemberItem[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [memberType, setMemberType] = useState<string>();
  const [groupName, setGroupName] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<"name" | "workYears" | "updatedAt" | undefined>();
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MemberItem | null>(null);
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<MemberColumnConfig[]>(
    loadColumnsFromStorage(),
  );
  const [columnWidths, setColumnWidths] = useState<Record<MemberColumnKey, number>>(
    loadColumnWidthsFromStorage(),
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMembers({
        page,
        pageSize,
        keyword: keyword || undefined,
        memberType,
        groupName,
        status,
        sortField,
        sortOrder,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      messageApi.error(`加载成员失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [groupName, keyword, memberType, messageApi, page, pageSize, sortField, sortOrder, status]);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await listMemberGroups();
      setGroups(data);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  const baseColumns = useMemo<NonNullable<TableProps<MemberItem>["columns"]>>(
    () => [
    { key: "memberId", dataIndex: "memberId", title: "成员ID", width: 150 },
    { key: "name", dataIndex: "name", title: "姓名", sorter: true, width: 140 },
    { key: "role", dataIndex: "role", title: "角色/职位", width: 180 },
    { key: "direction", dataIndex: "direction", title: "开发方向", width: 120 },
    {
      key: "memberType",
      dataIndex: "memberType",
      title: "成员类型",
      render: (value: string) => <Tag>{value === "employee" ? "自有员工" : "外包"}</Tag>,
      width: 120,
    },
    { key: "groupName", dataIndex: "groupName", title: "所属小组", width: 140 },
    {
      key: "status",
      dataIndex: "status",
      title: "状态",
      render: (value: string) => <Tag>{value}</Tag>,
      width: 110,
    },
    {
      key: "workYears",
      dataIndex: "workYears",
      title: "工作年限",
      sorter: true,
      width: 120,
    },
    {
      key: "updatedAt",
      dataIndex: "updatedAt",
      title: "更新时间",
      sorter: true,
      render: (value: number) => new Date(value * 1000).toLocaleString(),
      width: 200,
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
                name: record.name,
                role: record.role,
                direction: record.direction,
                hireDate: record.hireDate,
                workYears: record.workYears,
                memberType: record.memberType,
                groupName: record.groupName,
                status: record.status,
              });
            }}
          />
          <Popconfirm
            title="确认删除该成员？"
            onConfirm={async (e) => {
              e?.stopPropagation();
              await deleteMember(record.id);
              messageApi.success("删除成功");
              await fetchData();
              await fetchGroups();
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
    ],
    [editingForm, fetchData, fetchGroups, messageApi],
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

  const columns = useMemo(() => {
    const map = new Map(baseColumns.map((col) => [String(col.key), col]));
    const ordered = visibleColumnKeys
      .map((key) => map.get(key))
      .filter((col): col is NonNullable<typeof col> => Boolean(col));
    const actions = map.get("actions");
    const merged = actions ? [...ordered, actions] : ordered;
    return merged.map((col) => {
      const key = String(col.key);
      if (key === "actions") return col;
      const columnKey = key as MemberColumnKey;
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
  }, [baseColumns, columnWidths, visibleColumnKeys]);

  const handleTableChange: TableProps<MemberItem>["onChange"] = (
    pagination,
    _filters,
    sorter,
  ) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    if (!Array.isArray(sorter) && sorter.field) {
      const field = String(sorter.field);
      if (field === "name" || field === "workYears" || field === "updatedAt") {
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
            成员列表
          </Title>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setColumnDrawerOpen(true)}
            >
              列设置
            </Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新增成员
            </Button>
          </Space>
        </Space>

        <Space wrap>
          <Input.Search
            placeholder="搜索姓名/成员ID/角色"
            style={{ width: 280 }}
            allowClear
            onSearch={(value) => {
              setPage(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            style={{ width: 160 }}
            placeholder="成员类型"
            allowClear
            options={memberTypeOptions}
            value={memberType}
            onChange={(value) => {
              setPage(1);
              setMemberType(value);
            }}
          />
          <Select
            style={{ width: 180 }}
            placeholder="所属小组"
            allowClear
            options={groups.map((g) => ({ label: g, value: g }))}
            value={groupName}
            onChange={(value) => {
              setPage(1);
              setGroupName(value);
            }}
          />
          <Select
            style={{ width: 150 }}
            placeholder="状态"
            allowClear
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
          <Button onClick={() => void fetchData()}>刷新</Button>
        </Space>

        <Table<MemberItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          tableLayout="fixed"
          scroll={{ x: tableScrollX }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          dataSource={items}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => navigate(`/members/${record.id}`),
          })}
        />
      </Space>

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
            setColumnConfigs(defaultColumns.map((item) => ({ ...item })));
          }}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const activeId = String(active.id) as MemberColumnKey;
            const overId = String(over.id) as MemberColumnKey;
            const oldIndex = columnConfigs.findIndex((c) => c.columnKey === activeId);
            const newIndex = columnConfigs.findIndex((c) => c.columnKey === overId);
            if (oldIndex === -1 || newIndex === -1) return;
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

      <Modal
        title="新增成员"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await createMember(values);
          messageApi.success("创建成功");
          setCreateOpen(false);
          form.resetFields();
          await fetchData();
          await fetchGroups();
        }}
      >
        <Form<CreateMemberPayload>
          form={form}
          layout="vertical"
          initialValues={{
            role: "开发",
            direction: "全栈",
            hireDate: "2026-01-01",
            workYears: 1,
            memberType: "employee",
            groupName: "未分组",
            status: "active",
          }}
        >
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色/职位" name="role" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="开发方向" name="direction" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="入职日期(YYYY-MM-DD)" name="hireDate" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="工作年限" name="workYears" rules={[{ required: true }]}>
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="成员类型" name="memberType" rules={[{ required: true }]}>
            <Select options={memberTypeOptions} />
          </Form.Item>
          <Form.Item label="所属小组" name="groupName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑成员"
        open={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onOk={async () => {
          const values = await editingForm.validateFields();
          await updateMember(values);
          messageApi.success("更新成功");
          setEditingItem(null);
          await fetchData();
          await fetchGroups();
        }}
      >
        <Form<UpdateMemberPayload> form={editingForm} layout="vertical">
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色/职位" name="role" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="开发方向" name="direction" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="入职日期(YYYY-MM-DD)" name="hireDate" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="工作年限" name="workYears" rules={[{ required: true }]}>
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="成员类型" name="memberType" rules={[{ required: true }]}>
            <Select options={memberTypeOptions} />
          </Form.Item>
          <Form.Item label="所属小组" name="groupName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
