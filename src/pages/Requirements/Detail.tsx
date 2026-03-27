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
import { getRequirementDetail, updateRequirementDetail } from "@/api/requirement";
import type { RequirementDetail } from "@/types/requirement";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import MDEditor from "@uiw/react-md-editor";
import mermaid from "mermaid";
import "@uiw/react-md-editor/markdown-editor.css";
import "highlight.js/styles/github-dark.css";
import "github-markdown-css/github-markdown.css";

const { Title } = Typography;
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

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, chart);
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

  if (errorText) {
    return <pre>{errorText}</pre>;
  }
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function RequirementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [contentDraft, setContentDraft] = useState("");

  const requirementId = Number(id);

  const fetchDetail = useCallback(async () => {
    if (!Number.isInteger(requirementId) || requirementId <= 0) {
      messageApi.error("需求ID无效");
      return;
    }
    setLoading(true);
    try {
      const data = await getRequirementDetail(requirementId);
      setDetail(data);
      setContentDraft(data.content ?? "");
      form.setFieldsValue({
        title: data.title,
        status: data.status,
        priority: data.priority,
        owner: data.owner,
        effort: data.effort,
        planMonth: data.planMonth,
      });
    } catch (error) {
      messageApi.error(`加载需求详情失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [form, messageApi, requirementId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleSave = async () => {
    if (!detail) {
      return;
    }
    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateRequirementDetail({
        id: detail.id,
        projectId: detail.projectId ?? 0,
        title: values.title,
        status: values.status,
        priority: values.priority,
        owner: values.owner,
        effort: values.effort,
        planMonth: values.planMonth,
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
        onClick={() => navigate("/boards?tab=requirements")}
        style={{ width: "fit-content" }}
      >
        返回需求列表
      </Button>
      <Card loading={loading}>
        {!loading && detail && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              {detail.reqId} - {detail.title}
            </Title>
            {!editing && (
              <Space size={12}>
                <Tag>{detail.status}</Tag>
                <Tag color="orange">{detail.priority}</Tag>
                <Tag>{detail.owner}</Tag>
                <Tag>计划: {detail.planMonth}</Tag>
                <Tag>工作量: {detail.effort}</Tag>
                <Tag>{new Date(detail.updatedAt * 1000).toLocaleString()}</Tag>
              </Space>
            )}
            <Space>
              {!editing ? (
                <Button type="primary" onClick={() => setEditing(true)}>
                  编辑需求
                </Button>
              ) : (
                <>
                  <Button loading={saving} type="primary" onClick={handleSave}>
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(false);
                      form.setFieldsValue({
                        title: detail.title,
                        status: detail.status,
                        priority: detail.priority,
                        owner: detail.owner,
                        effort: detail.effort,
                        planMonth: detail.planMonth,
                      });
                      setContentDraft(detail.content);
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
                    <Col span={8}>
                      <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="工作量(人天)" name="effort" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="计划月份(YYYY-MM)"
                        name="planMonth"
                        rules={[{ required: true }]}
                      >
                        <Input />
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
      </Card>
    </Space>
  );
}
