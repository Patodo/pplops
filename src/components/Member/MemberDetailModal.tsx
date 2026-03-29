import { useCallback, useEffect, useState } from "react";
import { Col, Form, Input, InputNumber, Row, Select, Space, Tag, message } from "antd";
import { getMemberDetail, updateMemberDetail } from "@/api/member";
import type { MemberDetail } from "@/types/member";
import {
  DetailEditModalFrame,
  MarkdownDetailPreview,
  MarkdownEditorArea,
} from "@/components/DetailEditModal";

const memberTypeOptions = [
  { label: "自有员工", value: "employee" },
  { label: "外包", value: "outsource" },
];

const statusOptions = [
  { label: "在岗", value: "active" },
  { label: "休假", value: "leave" },
  { label: "离岗", value: "inactive" },
];

export function MemberDetailModal({
  open,
  memberId,
  initialEditing = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  memberId: number | null;
  initialEditing?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [contentDraft, setContentDraft] = useState("");

  const resetLocal = useCallback(() => {
    setDetail(null);
    setContentDraft("");
    setEditing(false);
    form.resetFields();
  }, [form]);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return;
    }
    if (memberId == null || memberId <= 0 || !Number.isInteger(memberId)) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setEditing(initialEditing);
      try {
        const data = await getMemberDetail(memberId);
        if (cancelled) return;
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
        if (!cancelled) {
          messageApi.error(`加载成员详情失败: ${String(error)}`);
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
  }, [open, memberId, initialEditing, form, messageApi, resetLocal]);

  const revertFormFromDetail = useCallback(() => {
    if (!detail) return;
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
    setContentDraft(detail.content ?? "");
  }, [detail, form]);

  const handleSave = async () => {
    if (!detail) return;
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
      const refreshed = await getMemberDetail(detail.id);
      setDetail(refreshed);
      setContentDraft(refreshed.content ?? "");
      form.setFieldsValue({
        name: refreshed.name,
        role: refreshed.role,
        direction: refreshed.direction,
        hireDate: refreshed.hireDate,
        workYears: refreshed.workYears,
        memberType: refreshed.memberType,
        groupName: refreshed.groupName,
        status: refreshed.status,
      });
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

  const modalTitle =
    detail != null ? `成员 · ${detail.memberId} - ${detail.name}` : "成员详情";

  const markdownPreview = detail?.content ?? "";

  return (
    <DetailEditModalFrame
      title={modalTitle}
      open={open}
      onModalClose={handleModalClose}
      loading={loading}
      editing={editing}
      saving={saving}
      recordReady={Boolean(detail)}
      onEnterEdit={() => setEditing(true)}
      onCancelEdit={() => {
        setEditing(false);
        revertFormFromDetail();
      }}
      onSave={handleSave}
      extra={contextHolder}
    >
      {detail && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {!editing && (
            <Space wrap size={8}>
              <Tag>{detail.role}</Tag>
              <Tag>{detail.direction}</Tag>
              <Tag>{detail.memberType === "employee" ? "自有员工" : "外包"}</Tag>
              <Tag>{detail.groupName}</Tag>
              <Tag>{detail.status}</Tag>
              <Tag>{new Date(detail.updatedAt * 1000).toLocaleString()}</Tag>
            </Space>
          )}
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
              <MarkdownEditorArea
                value={contentDraft}
                onChange={setContentDraft}
                active={open && editing}
                layoutKey={detail.id}
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
