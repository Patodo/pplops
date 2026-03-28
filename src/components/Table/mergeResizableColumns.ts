import type { ColumnsType } from "antd/es/table";
import type { Dispatch, SetStateAction } from "react";

export function mergeResizableColumns<T, K extends string>({
  baseColumns,
  visibleKeys,
  columnWidths,
  setColumnWidths,
  pinnedRightKeys,
}: {
  baseColumns: ColumnsType<T>;
  visibleKeys: K[];
  columnWidths: Record<K, number>;
  setColumnWidths: Dispatch<SetStateAction<Record<K, number>>>;
  /** 不参与列设置、固定在右侧的列 key（如 `actions`），可不在 `K` 中 */
  pinnedRightKeys: string[];
}): ColumnsType<T> {
  const map = new Map(baseColumns.map((col) => [String(col.key), col]));
  const pinned = new Set(pinnedRightKeys);

  const ordered = visibleKeys
    .map((key) => map.get(key))
    .filter((col): col is NonNullable<typeof col> => Boolean(col));

  const resized = ordered.map((col) => {
    const key = String(col.key) as K;
    if (pinned.has(key)) return col;
    const width = columnWidths[key];
    if (width === undefined) return col;
    return {
      ...col,
      width,
      onHeaderCell: () => ({
        width,
        onResizeStop: (nextWidth: number) => {
          const safeWidth = Math.max(80, Math.floor(nextWidth));
          setColumnWidths((prev) => ({ ...prev, [key]: safeWidth }));
        },
      }),
    };
  });

  const pinnedCols = pinnedRightKeys
    .map((key) => map.get(key))
    .filter((col): col is NonNullable<typeof col> => Boolean(col));

  const withoutPinnedInBody = resized.filter((col) => !pinned.has(String(col.key)));

  return [...withoutPinnedInBody, ...pinnedCols];
}
