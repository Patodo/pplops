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
  Tag,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import { DeleteOutlined, EditOutlined, SettingOutlined } from "@ant-design/icons";
import { MemberDetailModal } from "@/components/Member/MemberDetailModal";
import { applyColumnSortMeta, type ColumnSortSpec } from "@/components/Table/applyColumnSortMeta";
import {
  ColumnSettingsModal,
  type CommonColumnConfig,
} from "@/components/Table/ColumnSettingsModal";
import { mergeResizableColumns } from "@/components/Table/mergeResizableColumns";
import { PplopsDataTable } from "@/components/Table/PplopsDataTable";
import { usePersistedColumnLayout } from "@/components/Table/usePersistedColumnLayout";
import { createMember, deleteMember, listMemberGroups, listMembers } from "@/api/member";
import type { CreateMemberPayload, MemberItem } from "@/types/member";

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

const defaultColumns: CommonColumnConfig<MemberColumnKey>[] = [
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

export default function MembersListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CreateMemberPayload>();

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
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string>();
  const [detailModal, setDetailModal] = useState<{
    id: number;
    mode: "view" | "edit";
  } | null>(null);
  const {
    columnConfigs,
    setColumnConfigs,
    columnWidths,
    setColumnWidths,
    resetColumns,
  } = usePersistedColumnLayout<MemberColumnKey>({
    configStorageKey: COLUMN_CONFIG_KEY,
    widthStorageKey: COLUMN_WIDTH_KEY,
    defaultColumns,
    defaultWidths: defaultColumnWidths,
  });

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

  const baseColumns = useMemo<NonNullable<TableProps<MemberItem>["columns"]>>(
    () => [
      { key: "memberId", dataIndex: "memberId", title: "成员ID" },
      { key: "name", dataIndex: "name", title: "姓名" },
      { key: "role", dataIndex: "role", title: "角色/职位" },
      { key: "direction", dataIndex: "direction", title: "开发方向" },
      {
        key: "memberType",
        dataIndex: "memberType",
        title: "成员类型",
        render: (value: string) => <Tag>{value === "employee" ? "自有员工" : "外包"}</Tag>,
      },
      { key: "groupName", dataIndex: "groupName", title: "所属小组" },
      {
        key: "status",
        dataIndex: "status",
        title: "状态",
        render: (value: string) => <Tag>{value}</Tag>,
      },
      {
        key: "workYears",
        dataIndex: "workYears",
        title: "工作年限",
      },
      {
        key: "updatedAt",
        dataIndex: "updatedAt",
        title: "更新时间",
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
                setDetailModal({ id: record.id, mode: "edit" });
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
    [fetchData, fetchGroups, messageApi],
  );

  const memberSortSpec = useMemo<ColumnSortSpec<MemberColumnKey, MemberItem>>(
    () => ({
      name: { mode: "remote" },
      workYears: { mode: "remote" },
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
      applyColumnSortMeta<MemberItem, MemberColumnKey>({
        columns: baseColumns,
        sortSpec: memberSortSpec,
        remoteSort: {
          columnKey: sortField,
          order: sortOrder,
        },
      }),
    [baseColumns, memberSortSpec, sortField, sortOrder],
  );

  const tableColumns = useMemo(
    () =>
      mergeResizableColumns<MemberItem, MemberColumnKey>({
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
    return visibleWidth + 180;
  }, [columnWidths, visibleColumnKeys]);

  const handleTableChange: TableProps<MemberItem>["onChange"] = (pagination) => {
    setPage(pagination?.current ?? 1);
    setPageSize(pagination?.pageSize ?? 10);
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
            <Button icon={<SettingOutlined />} onClick={() => setColumnDrawerOpen(true)}>
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

        <Typography.Text type="secondary" style={{ display: "block" }}>
          单击选中行，双击打开详情（与看板一致）。操作列「编辑」直接进入编辑。
        </Typography.Text>

        <PplopsDataTable<MemberItem, MemberColumnKey>
          rowKey="id"
          loading={loading}
          columns={tableColumns}
          dataSource={items}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scrollX={tableScrollX}
          sortSpec={memberSortSpec}
          onRemoteSort={({ columnKey, order }) => {
            setSortField(
              columnKey === "name" || columnKey === "workYears" || columnKey === "updatedAt"
                ? columnKey
                : undefined,
            );
            setSortOrder(order);
          }}
          rowClassName={(record, index) => {
            const selected = String(record.id) === selectedRowKey ? "pplops-row-selected" : "";
            const zebra = index % 2 === 0 ? "pplops-row-even" : "pplops-row-odd";
            return [selected, zebra].filter(Boolean).join(" ");
          }}
          rowExpandInteraction="preset"
          onSelectedRowKeyChange={setSelectedRowKey}
          onToggleExpand={(record) => setDetailModal({ id: record.id, mode: "view" })}
        />
      </Space>

      <MemberDetailModal
        key={detailModal ? `${detailModal.id}-${detailModal.mode}` : "closed"}
        open={detailModal !== null}
        memberId={detailModal?.id ?? null}
        initialEditing={detailModal?.mode === "edit"}
        onClose={() => setDetailModal(null)}
        onSaved={() => {
          void fetchData();
          void fetchGroups();
        }}
      />

      <ColumnSettingsModal<MemberColumnKey>
        open={columnDrawerOpen}
        onClose={() => setColumnDrawerOpen(false)}
        titleMap={columnTitleMap}
        columnConfigs={columnConfigs}
        setColumnConfigs={setColumnConfigs}
        onResetDefault={resetColumns}
      />

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
    </div>
  );
}
