import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  getWorkItemDetail,
  listParentProjects,
  listParentRequirements,
  listParentTasks,
  updateWorkItem,
} from "@/api/work-item";
import type { WorkItem } from "@/types/work-item";
import {
  DetailEditModalFrame,
  MarkdownDetailPreview,
  MarkdownEditorArea,
} from "@/components/DetailEditModal";
import {
  kindTitleMap,
  statusOptionsForKind,
  workItemPriorityInputProps,
} from "@/config/work-item-form";

const { Text } = Typography;

type FormValues = {
  title: string;
  status: string;
  priority: number;
  owner: string;
  parentId?: number;
  effort?: number;
  planMonth?: string;
  plannedHours?: number;
  actualHours?: number;
  dueDate?: string;
};

export function WorkItemEditModal({
  open,
  workItemId,
  onClose,
  onSaved,
}: {
  open: boolean;
  workItemId: number | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState<WorkItem | null>(null);
  const [contentDraft, setContentDraft] = useState("");
  const [parentOptions, setParentOptions] = useState<
    { id: number; itemId: string; title: string }[]
  >([]);

  const resetLocal = useCallback(() => {
    setItem(null);
    setContentDraft("");
    setParentOptions([]);
    setEditing(false);
    form.resetFields();
  }, [form]);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return;
    }
    if (workItemId == null || workItemId <= 0 || !Number.isInteger(workItemId)) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setEditing(false);
      try {
        const data = await getWorkItemDetail(workItemId);
        if (cancelled) return;
        setItem(data);
        const nextContent = data.content ?? "";
        setContentDraft(nextContent);

        const values: Partial<FormValues> = {
          title: data.title,
          status: data.status,
          priority: data.priority,
          owner: data.owner,
        };
        if (data.kind === "requirement" || data.kind === "task" || data.kind === "subtask") {
          values.parentId = data.parentId;
        }
        if (data.kind === "requirement") {
          values.effort = data.effort ?? 0;
          values.planMonth = data.planMonth ?? "";
        }
        if (data.kind === "task" || data.kind === "subtask") {
          values.plannedHours = data.plannedHours ?? 0;
          values.actualHours = data.actualHours ?? 0;
          values.dueDate = data.dueDate ?? "";
        }
        form.setFieldsValue(values);

        if (data.kind === "requirement") {
          setParentOptions(await listParentProjects());
        } else if (data.kind === "task") {
          setParentOptions(await listParentRequirements());
        } else if (data.kind === "subtask") {
          setParentOptions(await listParentTasks());
        } else {
          setParentOptions([]);
        }
      } catch (error) {
        if (!cancelled) {
          messageApi.error(`加载失败: ${String(error)}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, workItemId, form, messageApi, resetLocal]);

  const kind = item?.kind;
  const statusOptions = useMemo(() => (kind ? statusOptionsForKind(kind) : []), [kind]);

  const markdownPreview = item?.content ?? "";

  const applyWorkItemToForm = useCallback(
    (data: WorkItem) => {
      const values: Partial<FormValues> = {
        title: data.title,
        status: data.status,
        priority: data.priority,
        owner: data.owner,
      };
      if (data.kind === "requirement" || data.kind === "task" || data.kind === "subtask") {
        values.parentId = data.parentId;
      }
      if (data.kind === "requirement") {
        values.effort = data.effort ?? 0;
        values.planMonth = data.planMonth ?? "";
      }
      if (data.kind === "task" || data.kind === "subtask") {
        values.plannedHours = data.plannedHours ?? 0;
        values.actualHours = data.actualHours ?? 0;
        values.dueDate = data.dueDate ?? "";
      }
      form.setFieldsValue(values);
      setContentDraft(data.content ?? "");
    },
    [form],
  );

  const revertFormFromItem = useCallback(() => {
    if (item) {
      applyWorkItemToForm(item);
    }
  }, [applyWorkItemToForm, item]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateWorkItem({
        id: item.id,
        parentId: item.kind === "project" ? undefined : values.parentId,
        title: values.title,
        status: values.status,
        priority: values.priority,
        owner: values.owner,
        content: contentDraft,
        effort: item.kind === "requirement" ? values.effort : undefined,
        planMonth: item.kind === "requirement" ? values.planMonth : undefined,
        plannedHours:
          item.kind === "task" || item.kind === "subtask" ? values.plannedHours : undefined,
        actualHours:
          item.kind === "task" || item.kind === "subtask" ? values.actualHours : undefined,
        dueDate: item.kind === "task" || item.kind === "subtask" ? values.dueDate : undefined,
      });
      messageApi.success("保存成功");
      setEditing(false);
      const refreshed = await getWorkItemDetail(item.id);
      setItem(refreshed);
      applyWorkItemToForm(refreshed);
      onSaved?.();
    } catch (error) {
      messageApi.error(`保存失败: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    resetLocal();
    onClose();
  };

  const modalTitle = item
    ? `编辑${kindTitleMap[item.kind]} · ${item.itemId}`
    : "编辑工作项";

  return (
    <DetailEditModalFrame
      title={modalTitle}
      open={open}
      onModalClose={handleModalClose}
      loading={loading}
      editing={editing}
      saving={saving}
      recordReady={Boolean(item)}
      onEnterEdit={() => setEditing(true)}
      onCancelEdit={() => {
        setEditing(false);
        revertFormFromItem();
      }}
      onSave={handleSave}
      extra={contextHolder}
    >
      {item && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {!editing && (
            <Space wrap size={8}>
              <Tag>{kindTitleMap[item.kind]}</Tag>
              <Tag>{item.status}</Tag>
              <Tag color="orange">{item.priority}</Tag>
              <Tag>{item.owner}</Tag>
              <Tag>{new Date(item.updatedAt * 1000).toLocaleString()}</Tag>
            </Space>
          )}
          {item.kind === "task" && (
            <Text type="secondary">
              子任务请在「看板」中展开该任务后，点击「分解下层」打开编排模态，或通过表格与编辑进行管理。
            </Text>
          )}
          {editing ? (
            <>
              <Form form={form} layout="vertical">
                <Row gutter={12}>
                  {item.kind === "requirement" && (
                    <Col span={24}>
                      <Form.Item
                        label="所属项目"
                        name="parentId"
                        rules={[{ required: true, message: "请选择项目" }]}
                      >
                        <Select
                          showSearch
                          options={parentOptions.map((p) => ({
                            label: `${p.itemId} - ${p.title}`,
                            value: p.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {item.kind === "task" && (
                    <Col span={24}>
                      <Form.Item
                        label="所属需求"
                        name="parentId"
                        rules={[{ required: true, message: "请选择需求" }]}
                      >
                        <Select
                          showSearch
                          options={parentOptions.map((p) => ({
                            label: `${p.itemId} - ${p.title}`,
                            value: p.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {item.kind === "subtask" && (
                    <Col span={24}>
                      <Form.Item
                        label="所属任务"
                        name="parentId"
                        rules={[{ required: true, message: "请选择任务" }]}
                      >
                        <Select
                          showSearch
                          options={parentOptions.map((p) => ({
                            label: `${p.itemId} - ${p.title}`,
                            value: p.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={12}>
                    <Form.Item label="标题" name="title" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="状态" name="status" rules={[{ required: true }]}>
                      <Select options={statusOptions} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="优先级 (0–65535，越小越优先)"
                      name="priority"
                      rules={[{ required: true, message: "请输入优先级" }]}
                    >
                      <InputNumber {...workItemPriorityInputProps} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={item.kind === "project" ? 24 : 12}>
                    <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  {item.kind === "requirement" && (
                    <>
                      <Col span={12}>
                        <Form.Item label="工作量(人天)" name="effort" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="计划月份(YYYY-MM)"
                          name="planMonth"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {(item.kind === "task" || item.kind === "subtask") && (
                    <>
                      <Col span={8}>
                        <Form.Item label="计划工时" name="plannedHours" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="实际工时" name="actualHours" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label="到期日(YYYY-MM-DD)"
                          name="dueDate"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              </Form>
              <MarkdownEditorArea
                value={contentDraft}
                onChange={setContentDraft}
                active={open && editing}
                layoutKey={item.id}
              />
            </>
          ) : (
            <MarkdownDetailPreview markdown={markdownPreview} />
          )}
        </Space>
      )}
    </DetailEditModalFrame>
  );
}
