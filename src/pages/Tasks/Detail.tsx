import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
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
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import MDEditor from "@uiw/react-md-editor";
import mermaid from "mermaid";
import "@uiw/react-md-editor/markdown-editor.css";
import "highlight.js/styles/github-dark.css";
import "github-markdown-css/github-markdown.css";
import { getTaskDetail, listTaskRequirements, updateTaskDetail } from "@/api/task";
import type { TaskDetail, TaskRequirementOption } from "@/types/task";

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

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");
  const [errorText, setErrorText] = useState("");
  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const uid = `mmd-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(uid, chart);
        if (!disposed) {
          setSvg(result.svg);
          setErrorText("");
        }
      } catch (error) {
        if (!disposed) {
          setErrorText(String(error));
          setSvg("");
        }
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [chart]);
  if (errorText) return <pre>{errorText}</pre>;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function TaskDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [requirements, setRequirements] = useState<TaskRequirementOption[]>([]);
  const [contentDraft, setContentDraft] = useState("");
  const taskId = Number(id);

  const reqMap = useMemo(() => new Map(requirements.map((r) => [r.id, r])), [requirements]);

  const fetchDetail = useCallback(async () => {
    if (!Number.isInteger(taskId) || taskId <= 0) {
      messageApi.error("任务ID无效");
      return;
    }
    setLoading(true);
    try {
      const [task, reqs] = await Promise.all([getTaskDetail(taskId), listTaskRequirements()]);
      setDetail(task);
      setRequirements(reqs);
      setContentDraft(task.content ?? "");
      form.setFieldsValue({
        requirementId: task.requirementId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        owner: task.owner,
        plannedHours: task.plannedHours,
        actualHours: task.actualHours,
        dueDate: task.dueDate,
      });
    } catch (error) {
      messageApi.error(`加载任务详情失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [form, messageApi, taskId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateTaskDetail({
        id: detail.id,
        requirementId: values.requirementId,
        title: values.title,
        status: values.status,
        priority: values.priority,
        owner: values.owner,
        plannedHours: values.plannedHours,
        actualHours: values.actualHours,
        dueDate: values.dueDate,
        content: contentDraft,
      });
      messageApi.success("保存成功");
      setEditing(false);
      await fetchDetail();
    } catch (error) {
      messageApi.error(`保存失败: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const markdownPreview = useMemo(() => detail?.content ?? "", [detail?.content]);

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {contextHolder}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/tasks")}
        style={{ width: "fit-content" }}
      >
        返回任务列表
      </Button>
      <Card loading={loading}>
        {!loading && detail && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              {detail.taskId} - {detail.title}
            </Title>
            {!editing && (
              <Space wrap>
                <Tag>{detail.status}</Tag>
                <Tag color="orange">{detail.priority}</Tag>
                <Tag>{detail.owner}</Tag>
                <Tag>
                  需求:
                  {reqMap.get(detail.requirementId)
                    ? `${reqMap.get(detail.requirementId)?.reqId}`
                    : detail.requirementId}
                </Tag>
                <Tag>到期: {detail.dueDate}</Tag>
              </Space>
            )}
            <Space>
              {!editing ? (
                <Button type="primary" onClick={() => setEditing(true)}>
                  编辑任务
                </Button>
              ) : (
                <>
                  <Button type="primary" loading={saving} onClick={handleSave}>
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(false);
                      form.setFieldsValue({
                        requirementId: detail.requirementId,
                        title: detail.title,
                        status: detail.status,
                        priority: detail.priority,
                        owner: detail.owner,
                        plannedHours: detail.plannedHours,
                        actualHours: detail.actualHours,
                        dueDate: detail.dueDate,
                      });
                      setContentDraft(detail.content ?? "");
                    }}
                  >
                    取消
                  </Button>
                </>
              )}
            </Space>
            {editing ? (
              <>
                <Form form={form} layout="vertical">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="关联需求" name="requirementId" rules={[{ required: true }]}>
                        <Select
                          options={requirements.map((item) => ({
                            label: `${item.reqId} - ${item.title}`,
                            value: item.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
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
                    <Col span={6}>
                      <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="到期日(YYYY-MM-DD)" name="dueDate" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="计划工时" name="plannedHours" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="实际工时" name="actualHours" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
                <MDEditor
                  value={contentDraft}
                  onChange={(value) => setContentDraft(value ?? "")}
                  height={640}
                  preview="edit"
                />
              </>
            ) : (
              <div className="markdown-body" data-color-mode="light">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  components={{
                    code(props) {
                      const { className, children } = props;
                      const language = className?.replace("language-", "");
                      const text = String(children).replace(/\n$/, "");
                      if (language === "mermaid") return <MermaidBlock chart={text} />;
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
      </Card>
    </Space>
  );
}
