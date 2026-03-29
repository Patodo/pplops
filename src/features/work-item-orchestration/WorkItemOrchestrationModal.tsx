import { DeleteOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Space, Spin, Typography, message } from "antd";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getWorkItemOrchestration, saveWorkItemOrchestration, type WorkItem } from "@/shared/work-item";
import {
  ORCH_COL_GROW_BUFFER,
  ORCH_COL_WIDTH,
  ORCH_PRESET_COLS,
  ORCH_ROW_HEIGHT,
  orchestrationLayoutFromItems,
  priorityFromGridCell,
  snapOrchestrationPosition,
} from "./priorityGrid";

const { Text } = Typography;

type Dep = { predecessorId: number; successorId: number };

const CARD_INSET = 4;
const NODE_W = Math.min(176, ORCH_COL_WIDTH * 2 - 8);
const NODE_H = ORCH_ROW_HEIGHT - 8;
const DRAG_CLICK_PX = 6;

function titleFor(items: WorkItem[], id: number): string {
  return items.find((i) => i.id === id)?.itemId ?? `#${id}`;
}

function edgePathSegments(
  deps: Dep[],
  positions: Record<number, { x: number; y: number }>,
): string[] {
  const paths: string[] = [];
  for (const d of deps) {
    const a = positions[d.predecessorId];
    const b = positions[d.successorId];
    if (!a || !b) continue;
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;
    const midX = (x1 + x2) / 2;
    paths.push(`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`);
  }
  return paths;
}

function pixelPosition(
  id: number,
  rowOrder: number[],
  cols: Record<number, number>,
): { x: number; y: number } {
  const row = rowOrder.indexOf(id);
  const col = cols[id] ?? 0;
  const x = col * ORCH_COL_WIDTH;
  const y = Math.max(0, row) * ORCH_ROW_HEIGHT;
  return { x: x + CARD_INSET, y: y + CARD_INSET };
}

function WorkItemOrchestrationModalCore({
  open,
  parentId,
  parentTitle,
  onClose,
  onSaved,
}: {
  open: boolean;
  parentId: number | null;
  parentTitle: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [rowOrder, setRowOrder] = useState<number[]>([]);
  const [cols, setCols] = useState<Record<number, number>>({});
  const [dependencies, setDependencies] = useState<Dep[]>([]);
  const [linkSourceId, setLinkSourceId] = useState<number | null>(null);
  const markerSuffix = useId().replace(/:/g, "");
  const [drag, setDrag] = useState<{
    id: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dx: number;
    dy: number;
  } | null>(null);

  /** 与 items 对齐：避免 rowOrder 缺 id 时卡片不渲染（displayPositions 无键）。 */
  const rowOrderEnsured = useMemo(() => {
    const idSet = new Set(items.map((i) => i.id));
    const next = rowOrder.filter((id) => idSet.has(id));
    for (const it of items) {
      if (!next.includes(it.id)) next.push(it.id);
    }
    return next;
  }, [items, rowOrder]);

  const rowOrderEnsuredRef = useRef(rowOrderEnsured);
  rowOrderEnsuredRef.current = rowOrderEnsured;

  const orchestrationLoadGenRef = useRef(0);

  const loadData = useCallback(async () => {
    if (parentId == null || parentId <= 0) return;
    const gen = ++orchestrationLoadGenRef.current;
    setLoading(true);
    try {
      const data = await getWorkItemOrchestration(parentId);
      if (gen !== orchestrationLoadGenRef.current) return;
      setItems(data.items);
      setChildCount(data.items.length);
      const { rowOrder: ro, cols: c } = orchestrationLayoutFromItems(
        data.items.map((it) => ({ id: it.id, priority: it.priority })),
      );
      setRowOrder(ro);
      setCols(c);
      setDependencies(data.dependencies);
      setLinkSourceId(null);
      setDirty(false);
    } catch (err) {
      messageApi.error(`加载编排失败: ${String(err)}`);
      setItems([]);
      setRowOrder([]);
      setCols({});
      setDependencies([]);
      setChildCount(0);
    } finally {
      setLoading(false);
    }
  }, [messageApi, parentId]);

  useEffect(() => {
    if (!open || parentId == null) return;
    void loadData();
  }, [open, parentId, loadData]);

  /** 保证 rowOrder 含全部子项 id，否则绝对定位卡片无坐标、画布高度也可能塌缩。 */
  useEffect(() => {
    if (items.length === 0) return;
    setRowOrder((order) => {
      const idSet = new Set(items.map((i) => i.id));
      const kept = order.filter((id) => idSet.has(id));
      const seen = new Set(kept);
      const appended: number[] = [];
      for (const it of items) {
        if (!seen.has(it.id)) {
          seen.add(it.id);
          appended.push(it.id);
        }
      }
      if (appended.length === 0 && kept.length === order.length) return order;
      return [...kept, ...appended];
    });
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkSourceId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (drag == null) return;
    const { id, startX, startY, originX, originY } = drag;
    const onMove = (e: PointerEvent) => {
      setDrag((d) =>
        d && d.id === id
          ? { ...d, dx: e.clientX - startX, dy: e.clientY - startY }
          : d,
      );
    };
    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const moved = Math.hypot(dx, dy);
      const cur = { x: originX + dx, y: originY + dy };
      const n = rowOrderEnsuredRef.current.length;
      const maxRow = Math.max(0, n - 1);
      const snapped = snapOrchestrationPosition(cur, maxRow);

      if (moved >= DRAG_CLICK_PX) {
        setRowOrder((order) => {
          const from = order.indexOf(id);
          if (from < 0) return order;
          const next = [...order];
          next.splice(from, 1);
          const t = Math.max(0, Math.min(snapped.row, next.length));
          next.splice(t, 0, id);
          return next;
        });
        setCols((prev) => ({ ...prev, [id]: snapped.col }));
        setDirty(true);
      }

      if (moved < DRAG_CLICK_PX) {
        setLinkSourceId((prev) => {
          if (prev === null) {
            messageApi.info("已选前驱，请点击另一卡片作为后继（依赖方向：前驱 → 后继）");
            return id;
          }
          if (prev === id) {
            return null;
          }
          let added = false;
          setDependencies((deps) => {
            if (deps.some((d) => d.predecessorId === prev && d.successorId === id)) {
              return deps;
            }
            added = true;
            return [...deps, { predecessorId: prev, successorId: id }];
          });
          if (added) {
            setDirty(true);
            messageApi.success("已添加依赖");
          } else {
            messageApi.warning("该依赖已存在");
          }
          return null;
        });
      }

      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag?.id, drag?.startX, drag?.startY, drag?.originX, drag?.originY, messageApi]);

  const positions = useMemo(() => {
    const out: Record<number, { x: number; y: number }> = {};
    for (const id of rowOrderEnsured) {
      out[id] = pixelPosition(id, rowOrderEnsured, cols);
    }
    return out;
  }, [rowOrderEnsured, cols]);

  const displayPositions = useMemo(() => {
    const out = { ...positions };
    if (drag) {
      out[drag.id] = {
        x: drag.originX + drag.dx,
        y: drag.originY + drag.dy,
      };
    }
    return out;
  }, [positions, drag]);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      const p = positions[id];
      if (!p) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({
        id,
        startX: e.clientX,
        startY: e.clientY,
        originX: p.x,
        originY: p.y,
        dx: 0,
        dy: 0,
      });
    },
    [positions],
  );

  const handleCloseRequest = useCallback(() => {
    if (dirty) {
      Modal.confirm({
        title: "未保存的更改",
        content: "关闭将丢弃当前编排修改，是否继续？",
        okText: "丢弃并关闭",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: () => {
          setDirty(false);
          onClose();
        },
      });
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const handleReset = useCallback(() => {
    void loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (parentId == null) return;
    const payloadItems = items.map((it) => {
      const row = rowOrderEnsured.indexOf(it.id);
      const col = cols[it.id] ?? 0;
      const r = row >= 0 ? row : 0;
      return { id: it.id, priority: priorityFromGridCell(col, r) };
    });
    setSaving(true);
    try {
      await saveWorkItemOrchestration({
        parentId,
        items: payloadItems,
        dependencies,
      });
      messageApi.success("已保存编排");
      setDirty(false);
      onSaved?.();
    } catch (err) {
      messageApi.error(`保存失败: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [cols, dependencies, items, messageApi, onSaved, parentId, rowOrderEnsured]);

  const removeDep = useCallback((index: number) => {
    setDependencies((d) => d.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  const maxColUsed = useMemo(() => {
    let m = 0;
    for (const id of rowOrderEnsured) {
      m = Math.max(m, cols[id] ?? 0);
    }
    if (drag) {
      const ghostCol = Math.round((drag.originX + drag.dx) / ORCH_COL_WIDTH);
      m = Math.max(m, ghostCol);
    }
    return m;
  }, [rowOrderEnsured, cols, drag]);

  const canvasCols = Math.max(ORCH_PRESET_COLS, maxColUsed + 1 + ORCH_COL_GROW_BUFFER);
  const nRows = rowOrderEnsured.length;
  const canvasW = canvasCols * ORCH_COL_WIDTH;
  const canvasH = Math.max(ORCH_ROW_HEIGHT, nRows * ORCH_ROW_HEIGHT);

  const edgePaths = useMemo(
    () => edgePathSegments(dependencies, displayPositions),
    [dependencies, displayPositions],
  );

  const mid = `orch-arr-${markerSuffix}`;

  const modalTitle = `编排下级 · ${parentTitle || "工作项"}`;

  const bodyHeight = "min(90vh, 920px)";

  return (
    <>
      {messageContextHolder}
      <Modal
        title={
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <span>{modalTitle}</span>
            <Space>
              <Button onClick={handleReset} disabled={loading || saving}>
                重置
              </Button>
              <Button type="primary" loading={saving} disabled={loading} onClick={() => void handleSave()}>
                保存
              </Button>
            </Space>
          </div>
        }
        open={open}
        onCancel={handleCloseRequest}
        width="96vw"
        style={{ top: 12 }}
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: bodyHeight,
            overflow: "hidden",
          },
        }}
        footer={null}
        destroyOnHidden
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center" style={{ minHeight: bodyHeight }}>
            <Spin />
          </div>
        ) : childCount === 0 ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 px-6"
            style={{ minHeight: bodyHeight }}
          >
            <Empty description="暂无下级工作项" />
            <Text type="secondary">
              请使用看板顶部「新增」并选择上级，或展开行后通过其他入口创建子项后再来编排。
            </Text>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto bg-neutral-100/90">
              <div
                className="relative border-b border-r border-neutral-200 bg-white"
                style={{
                  width: canvasW,
                  minHeight: canvasH,
                  backgroundImage: `
                    linear-gradient(#e5e7eb 1px, transparent 1px),
                    linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: `${ORCH_COL_WIDTH}px ${ORCH_ROW_HEIGHT}px`,
                  backgroundPosition: "0 0",
                }}
              >
                {/* 占住文档流尺寸：子节点均为 absolute 时滚动区域高度曾为 0，导致「看不到」画布内容 */}
                <div
                  className="pointer-events-none shrink-0"
                  style={{ width: canvasW, height: canvasH }}
                  aria-hidden
                />
                <svg
                  className="pointer-events-none absolute left-0 top-0 z-[1]"
                  width={canvasW}
                  height={canvasH}
                >
                  <defs>
                    <marker
                      id={mid}
                      markerWidth="7"
                      markerHeight="7"
                      refX="6"
                      refY="3.5"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {edgePaths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.25}
                      markerEnd={`url(#${mid})`}
                    />
                  ))}
                </svg>
                {items.map((it) => {
                  const p = displayPositions[it.id];
                  if (!p) return null;
                  const hue = (it.id * 47) % 360;
                  const selected = linkSourceId === it.id;
                  return (
                    <div
                      key={it.id}
                      role="button"
                      tabIndex={0}
                      className="absolute z-[2] flex cursor-grab select-none flex-col justify-center rounded-xl border px-2.5 py-1.5 text-left shadow-sm active:cursor-grabbing"
                      style={{
                        left: p.x,
                        top: p.y,
                        width: NODE_W,
                        minHeight: NODE_H,
                        backgroundColor: `hsl(${hue} 58% 93%)`,
                        borderColor: selected ? "rgb(234 179 8)" : "rgb(209 213 219)",
                        boxShadow: selected ? "0 0 0 2px rgba(234,179,8,0.35)" : undefined,
                        touchAction: "none",
                      }}
                      onPointerDown={(e) => handleNodePointerDown(e, it.id)}
                    >
                      <div className="truncate text-sm font-medium text-neutral-900">{it.title}</div>
                      <div className="truncate text-xs text-neutral-500">{it.itemId}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0 space-y-2 border-t border-neutral-200 bg-neutral-50 px-3 py-2">
              <Text type="secondary" className="text-xs leading-relaxed">
                <strong>拖动</strong>
                卡片：横向为列（至少 {ORCH_PRESET_COLS} 列，可继续向右扩展），纵向为同级顺序（一行一项，越靠上越优先）。网格与画布左上角对齐。
                <strong>连点</strong>
                两次卡片建立依赖：第一次选前驱，第二次选后继；再点同一卡片取消。按 Esc 取消选中的前驱。
              </Text>
              {dependencies.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {dependencies.map((d, i) => (
                    <Space key={`${d.predecessorId}-${d.successorId}-${i}`} className="text-xs" size={4}>
                      <span className="text-neutral-600">
                        {titleFor(items, d.predecessorId)} → {titleFor(items, d.successorId)}
                      </span>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="p-0!"
                        onClick={() => removeDep(i)}
                      >
                        删除
                      </Button>
                    </Space>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export function WorkItemOrchestrationModal(props: {
  open: boolean;
  parentId: number | null;
  parentTitle: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  return <WorkItemOrchestrationModalCore {...props} />;
}
