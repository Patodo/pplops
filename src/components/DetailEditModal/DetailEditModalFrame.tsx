import { Button, Modal, Space, Spin } from "antd";
import type { ReactNode } from "react";
import {
  DETAIL_MODAL_BODY_HEIGHT,
  DETAIL_MODAL_WIDTH,
} from "./constants";

export type DetailEditModalFrameProps = {
  title: ReactNode;
  open: boolean;
  onModalClose: () => void;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  /** 控制「编辑」按钮是否可点（通常为已加载到实体记录） */
  recordReady: boolean;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void | Promise<void>;
  /** 弹窗主体，通常包在 `record && <Space>...</Space>` 内 */
  children: ReactNode;
  /** 如 `message.useMessage()` 的 `contextHolder` */
  extra?: ReactNode;
};

export function DetailEditModalFrame({
  title,
  open,
  onModalClose,
  loading,
  editing,
  saving,
  recordReady,
  onEnterEdit,
  onCancelEdit,
  onSave,
  children,
  extra,
}: DetailEditModalFrameProps) {
  return (
    <Modal
      title={title}
      open={open}
      centered
      onCancel={onModalClose}
      width={DETAIL_MODAL_WIDTH}
      styles={{
        body: {
          height: DETAIL_MODAL_BODY_HEIGHT,
          minHeight: DETAIL_MODAL_BODY_HEIGHT,
          maxHeight: DETAIL_MODAL_BODY_HEIGHT,
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
              <Button onClick={onModalClose}>关闭</Button>
              <Button
                type="primary"
                onClick={onEnterEdit}
                disabled={!recordReady || loading}
              >
                编辑
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onCancelEdit}>取消</Button>
              <Button type="primary" loading={saving} onClick={() => void onSave()}>
                保存
              </Button>
            </>
          )}
        </Space>
      }
    >
      {extra}
      <Spin spinning={loading}>{children}</Spin>
    </Modal>
  );
}
