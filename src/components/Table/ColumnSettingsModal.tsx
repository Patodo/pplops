import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckSquareOutlined,
  HolderOutlined,
  MinusSquareOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Modal, Space } from "antd";

export type CommonColumnConfig<K extends string> = {
  columnKey: K;
  visible: boolean;
  order: number;
};

function SortableColumnItem<K extends string>({
  config,
  titleMap,
  onToggleVisible,
}: {
  config: CommonColumnConfig<K>;
  titleMap: Record<K, string>;
  onToggleVisible: (key: K) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: config.columnKey,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
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
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button type="text" size="small" icon={<HolderOutlined />} {...attributes} {...listeners} />
        <Checkbox
          checked={config.visible}
          onChange={() => onToggleVisible(config.columnKey)}
        />
        <span>{titleMap[config.columnKey]}</span>
      </div>
    </div>
  );
}

export function ColumnSettingsModal<K extends string>({
  title = "列设置",
  open,
  onClose,
  titleMap,
  columnConfigs,
  setColumnConfigs,
  onResetDefault,
}: {
  title?: string;
  open: boolean;
  onClose: () => void;
  titleMap: Record<K, string>;
  columnConfigs: CommonColumnConfig<K>[];
  setColumnConfigs: React.Dispatch<React.SetStateAction<CommonColumnConfig<K>[]>>;
  onResetDefault: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ordered = [...columnConfigs].sort((a, b) => a.order - b.order);
  const visibleCount = ordered.filter((v) => v.visible).length;
  const allChecked = visibleCount === ordered.length;
  const indeterminate = visibleCount > 0 && visibleCount < ordered.length;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id) as K;
    const overId = String(over.id) as K;
    const oldIndex = ordered.findIndex((c) => c.columnKey === activeId);
    const newIndex = ordered.findIndex((c) => c.columnKey === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...ordered];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setColumnConfigs(next.map((c, index) => ({ ...c, order: index })));
  };

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null}>
      <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
        <Checkbox
          checked={allChecked}
          indeterminate={indeterminate}
          onChange={(e) => {
            const checked = e.target.checked;
            setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: checked })));
          }}
        >
          全选
        </Checkbox>
        <Space>
          <Button
            size="small"
            icon={<CheckSquareOutlined />}
            onClick={() => setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: true })))}
          >
            全选
          </Button>
          <Button
            size="small"
            icon={<MinusSquareOutlined />}
            onClick={() => setColumnConfigs((prev) => prev.map((item) => ({ ...item, visible: false })))}
          >
            全不选
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={onResetDefault}>
            重置默认
          </Button>
        </Space>
      </Space>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={ordered.map((v) => v.columnKey)}
          strategy={verticalListSortingStrategy}
        >
          {ordered.map((config) => (
            <SortableColumnItem
              key={config.columnKey}
              config={config}
              titleMap={titleMap}
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
  );
}
