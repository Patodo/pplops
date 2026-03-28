import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "highlight.js/styles/github-dark.css";
import "github-markdown-css/github-markdown.css";
import {
  getWorkItemDetail,
  listParentProjects,
  listParentRequirements,
  listParentTasks,
  updateWorkItem,
} from "@/api/work-item";
import type { WorkItem } from "@/types/work-item";
import { MermaidBlock } from "@/components/Markdown/MermaidBlock";
import { kindTitleMap, priorityOptions, statusOptionsForKind } from "@/config/work-item-form";

const { Text } = Typography;

/** 宽度相对视口（屏宽百分比）；高度用 vh（视口高度比例）。MDEditor 仅支持像素高度，由下方容器 ResizeObserver 同步。 */
const MODAL_WIDTH = "92%";
const MODAL_BODY_HEIGHT = "74vh";
const MD_EDITOR_AREA_HEIGHT = "52vh";
const MARKDOWN_PREVIEW_MIN_HEIGHT = "48vh";

type FormValues = {
  title: string;
  status: string;
  priority: string;
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
  const mdEditorHostRef = useRef<HTMLDivElement>(null);
  const [mdEditorHeightPx, setMdEditorHeightPx] = useState(400);

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

  useLayoutEffect(() => {
    if (!open || !editing) return;
    const el = mdEditorHostRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      setMdEditorHeightPx(Math.max(240, Math.floor(h)));
    };
    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, editing, item?.id]);

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
    <Modal
      title={modalTitle}
      open={open}
      centered
      onCancel={handleModalClose}
      width={MODAL_WIDTH}
      styles={{
        body: {
          height: MODAL_BODY_HEIGHT,
          minHeight: MODAL_BODY_HEIGHT,
          maxHeight: MODAL_BODY_HEIGHT,
          overflowY: "auto",
          paddingTop: 12,
          boxSizing: "border-box",
        },
      }}
      destroyOnClose
      footer={
        <Space>
          {!editing ? (
            <>
              <Button onClick={handleModalClose}>关闭</Button>
              <Button type="primary" onClick={() => setEditing(true)} disabled={!item || loading}>
                编辑
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  revertFormFromItem();
                }}
              >
                取消
              </Button>
              <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                保存
              </Button>
            </>
          )}
        </Space>
      }
    >
      {contextHolder}
      <Spin spinning={loading}>
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
                子任务请在「看板」中展开该任务后，使用「分解下层」或表格操作进行管理。
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
                      <Form.Item label="优先级" name="priority" rules={[{ required: true }]}>
                        <Select options={priorityOptions} />
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
                <div
                  ref={mdEditorHostRef}
                  style={{
                    width: "100%",
                    height: MD_EDITOR_AREA_HEIGHT,
                    minHeight: 240,
                  }}
                >
                  <MDEditor
                    value={contentDraft}
                    onChange={(value) => setContentDraft(value ?? "")}
                    height={mdEditorHeightPx}
                    preview="edit"
                  />
                </div>
              </>
            ) : (
              <div
                className="markdown-body"
                data-color-mode="light"
                style={{ minHeight: MARKDOWN_PREVIEW_MIN_HEIGHT }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  components={{
                    code(props) {
                      const { className, children } = props;
                      const language = className?.replace("language-", "");
                      const text = String(children).replace(/\n$/, "");
                      if (language === "mermaid") {
                        return <MermaidBlock chart={text} />;
                      }
                      return <code className={className}>{children}</code>;
                    },
                  }}
                >
                  {markdownPreview}
                </ReactMarkdown>
              </div>
            )}
          </Space>
        )}
      </Spin>
    </Modal>
  );
}
