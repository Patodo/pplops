import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Space, Switch, Typography, message } from "antd";
import { getAppSettings, refreshDataCache, setAppSettings } from "@/api/app";

const { Paragraph, Text } = Typography;

export default function SettingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [memoryCacheMode, setMemoryCacheMode] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getAppSettings();
      setMemoryCacheMode(s.memoryCacheMode);
      setCacheLoaded(s.cacheLoaded);
    } catch (e) {
      messageApi.error(`加载设置失败: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const s = await setAppSettings({ memoryCacheMode: checked });
      setMemoryCacheMode(s.memoryCacheMode);
      setCacheLoaded(s.cacheLoaded);
      messageApi.success(checked ? "已开启内存缓存（首次加载可能略慢）" : "已关闭内存缓存");
    } catch (e) {
      messageApi.error(`保存失败: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDataCache();
      await load();
      messageApi.success("已从数据库重新加载缓存");
    } catch (e) {
      messageApi.error(`刷新失败: ${String(e)}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Card loading={loading} title="数据与性能">
        <Space direction="vertical" size="middle" className="w-full max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <Text strong>内存缓存模式</Text>
            <Switch
              checked={memoryCacheMode}
              loading={saving}
              onChange={(checked) => void onToggle(checked)}
            />
            <Text type="secondary">
              {memoryCacheMode ? (cacheLoaded ? "已加载" : "未加载") : "关闭"}
            </Text>
          </div>
          <Paragraph type="secondary" className="mb-0">
            开启后将工作项、编排依赖与成员全量载入内存，读操作从内存返回，写入仍先落库再同步内存，可减少界面卡顿。
            数据量很大时首次开启或启动应用可能略慢。
          </Paragraph>
          <Alert
            type="info"
            showIcon
            message="重新加载缓存"
            description="若怀疑内存与数据库不一致，可从数据库全量重灌缓存（不关闭开关时有效）。"
          />
          <Button disabled={!memoryCacheMode} loading={refreshing} onClick={() => void onRefresh()}>
            从数据库重新加载缓存
          </Button>
        </Space>
      </Card>
    </>
  );
}
