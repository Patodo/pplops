import type { ColumnsType } from "antd/es/table";

export type RemoteSortOrder = "ascend" | "descend" | undefined;

export type ColumnSortSpecEntry<T = unknown> = {
  mode: "client" | "remote";
  compare?: (a: T, b: T) => number;
};

export type ColumnSortSpec<K extends string, T = unknown> = Partial<Record<K, ColumnSortSpecEntry<T>>>;

export function applyColumnSortMeta<T, K extends string>({
  columns,
  sortSpec,
  remoteSort,
}: {
  columns: ColumnsType<T>;
  sortSpec?: ColumnSortSpec<K, T>;
  remoteSort?: { columnKey: K | undefined; order: RemoteSortOrder };
}): ColumnsType<T> {
  if (!sortSpec || Object.keys(sortSpec).length === 0) return columns;

  return columns.map((col) => {
    const key = col.key;
    if (key === undefined || key === null) return col;
    const keyStr = String(key) as K;
    const spec = sortSpec[keyStr];
    if (!spec) return col;

    if (spec.mode === "client") {
      return {
        ...col,
        sorter: spec.compare ?? true,
      };
    }

    return {
      ...col,
      sorter: true,
      sortOrder: remoteSort?.columnKey === keyStr ? remoteSort.order : undefined,
    };
  });
}
