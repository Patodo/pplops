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
import { getMemberDetail, updateMemberDetail } from "@/api/member";
import type { MemberDetail } from "@/types/member";

const { Title } = Typography;

const memberTypeOptions = [
  { label: "自有员工", value: "employee" },
  { label: "外包", value: "outsource" },
];

const statusOptions = [
  { label: "在岗", value: "active" },
  { label: "休假", value: "leave" },
  { label: "离岗", value: "inactive" },
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

export default function MemberDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [contentDraft, setContentDraft] = useState("");

  const memberId = Number(id);

  const fetchDetail = useCallback(async () => {
    if (!Number.isInteger(memberId) || memberId <= 0) {
      messageApi.error("成员ID无效");
      return;
    }
    setLoading(true);
    try {
      const data = await getMemberDetail(memberId);
      setDetail(data);
      setContentDraft(data.content ?? "");
      form.setFieldsValue({
        name: data.name,
        role: data.role,
        direction: data.direction,
        hireDate: data.hireDate,
        workYears: data.workYears,
        memberType: data.memberType,
        groupName: data.groupName,
        status: data.status,
      });
    } catch (error) {
      messageApi.error(`加载成员详情失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [form, memberId, messageApi]);

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
      await updateMemberDetail({
        id: detail.id,
        name: values.name,
        role: values.role,
        direction: values.direction,
        hireDate: values.hireDate,
        workYears: values.workYears,
        memberType: values.memberType,
        groupName: values.groupName,
        status: values.status,
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
        onClick={() => navigate("/members")}
        style={{ width: "fit-content" }}
      >
        返回成员列表
      </Button>

      <Card loading={loading}>
        {!loading && detail && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              {detail.memberId} - {detail.name}
            </Title>
            {!editing && (
              <Space size={12}>
                <Tag>{detail.role}</Tag>
                <Tag>{detail.direction}</Tag>
                <Tag>{detail.memberType === "employee" ? "自有员工" : "外包"}</Tag>
                <Tag>{detail.groupName}</Tag>
                <Tag>{detail.status}</Tag>
                <Tag>{new Date(detail.updatedAt * 1000).toLocaleString()}</Tag>
              </Space>
            )}
            <Space>
              {!editing ? (
                <Button type="primary" onClick={() => setEditing(true)}>
                  编辑成员
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
                        name: detail.name,
                        role: detail.role,
                        direction: detail.direction,
                        hireDate: detail.hireDate,
                        workYears: detail.workYears,
                        memberType: detail.memberType,
                        groupName: detail.groupName,
                        status: detail.status,
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
                    <Col span={8}>
                      <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="角色/职位" name="role" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="开发方向" name="direction" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="入职日期(YYYY-MM-DD)"
                        name="hireDate"
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="工作年限" name="workYears" rules={[{ required: true }]}>
                        <InputNumber min={0} max={50} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="成员类型" name="memberType" rules={[{ required: true }]}>
                        <Select options={memberTypeOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="所属小组" name="groupName" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="状态" name="status" rules={[{ required: true }]}>
                        <Select options={statusOptions} />
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
