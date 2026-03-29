import { PRIORITY_VALUE_MAX, PRIORITY_VALUE_MIN } from "@/lib/workItemPriority";

/**
 * 编排网格编码：高 8 位 = 列 col（0..255，越小越靠左），低 8 位 = 行 row（0..255，越小越靠上）。
 * 画布上每一子项占一行，row 与纵向顺序一致。
 */
const ROW_MASK = 0xff;
const MAX_ORCH_COL = 255;
const MAX_ORCH_ROW = 255;

export const ORCH_PRESET_COLS = 100;
export const ORCH_COL_GROW_BUFFER = 6;
export const ORCH_COL_WIDTH = 88;
export const ORCH_ROW_HEIGHT = 52;

export function encodeOrchestrationPriority(col: number, row: number): number {
  const c = Math.min(MAX_ORCH_COL, Math.max(0, Math.round(col)));
  const r = Math.min(MAX_ORCH_ROW, Math.max(0, Math.round(row)));
  return Math.min(PRIORITY_VALUE_MAX, Math.max(PRIORITY_VALUE_MIN, (c << 8) | r));
}

export function decodeOrchestrationPriority(p: number): { col: number; row: number } {
  const P = Math.min(PRIORITY_VALUE_MAX, Math.max(PRIORITY_VALUE_MIN, Math.round(p)));
  return { col: P >> 8, row: P & ROW_MASK };
}

export function layoutPositionForCell(col: number, row: number): { x: number; y: number } {
  return {
    x: col * ORCH_COL_WIDTH,
    y: row * ORCH_ROW_HEIGHT,
  };
}

export function layoutPositionForPriority(priority: number): { x: number; y: number } {
  const { col, row } = decodeOrchestrationPriority(priority);
  return layoutPositionForCell(col, row);
}

/** 将像素位置吸附到网格左上角；row 限制在 [0, maxRowIndex]。 */
export function snapOrchestrationPosition(
  pos: { x: number; y: number },
  maxRowIndex: number,
): { x: number; y: number; col: number; row: number } {
  const maxR = Math.max(0, Math.floor(maxRowIndex));
  const rawCol = pos.x / ORCH_COL_WIDTH;
  const col = Math.min(MAX_ORCH_COL, Math.max(0, Math.round(rawCol)));
  const rawRow = pos.y / ORCH_ROW_HEIGHT;
  const row = Math.min(maxR, Math.max(0, Math.round(rawRow)));
  const { x, y } = layoutPositionForCell(col, row);
  return { x, y, col, row };
}

export function priorityFromGridCell(col: number, row: number): number {
  return encodeOrchestrationPriority(col, row);
}

/** 从服务端数据恢复行顺序与列号；全员相同 priority 时视为未编排过，列统一为 0。 */
export function orchestrationLayoutFromItems(
  items: Array<{ id: number; priority: number }>,
): { rowOrder: number[]; cols: Record<number, number> } {
  if (items.length === 0) return { rowOrder: [], cols: {} };
  const samePriority = items.every((i) => i.priority === items[0]!.priority);
  const sorted = [...items].sort((a, b) => {
    const da = decodeOrchestrationPriority(a.priority);
    const db = decodeOrchestrationPriority(b.priority);
    return (
      da.row - db.row ||
      da.col - db.col ||
      a.priority - b.priority ||
      a.id - b.id
    );
  });
  const cols: Record<number, number> = {};
  for (const it of sorted) {
    const d = decodeOrchestrationPriority(it.priority);
    cols[it.id] = samePriority ? 0 : d.col;
  }
  return { rowOrder: sorted.map((i) => i.id), cols };
}
