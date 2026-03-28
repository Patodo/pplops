import { Table } from "antd";
import type { TableProps } from "antd";
import type { RemoteSortOrder, ColumnSortSpec } from "./applyColumnSortMeta";
import { ResizableHeaderCell } from "./ResizableHeaderCell";
import "./table.css";

function getRecordKey<T>(record: T, rowKey: TableProps<T>["rowKey"]): string {
  if (typeof rowKey === "function") {
    return String(rowKey(record));
  }
  if (typeof rowKey === "string") {
    const v = (record as Record<string, unknown>)[rowKey];
    return v != null ? String(v) : "";
  }
  return "";
}

export type PplopsDataTableProps<T, K extends string = string> = Omit<
  TableProps<T>,
  "onChange" | "onRow" | "className" | "scroll" | "components" | "tableLayout" | "size"
> & {
  className?: string;
  scrollX?: number;
  onChange?: TableProps<T>["onChange"];
  onRow?: TableProps<T>["onRow"];
  rowExpandInteraction?: "none" | "preset";
  selectedRowKey?: string;
  onSelectedRowKeyChange?: (key: string | undefined) => void;
  onToggleExpand?: (record: T) => void | Promise<void>;
  sortSpec?: ColumnSortSpec<K, T>;
  onRemoteSort?: (payload: { columnKey: K | undefined; order: RemoteSortOrder }) => void;
};

export function PplopsDataTable<T, K extends string = string>({
  className,
  scrollX,
  onChange,
  onRow,
  rowExpandInteraction = "none",
  onSelectedRowKeyChange,
  onToggleExpand,
  rowKey,
  sortSpec,
  onRemoteSort,
  ...rest
}: PplopsDataTableProps<T, K>) {
  const mergedClassName = ["pplops-data-table", className].filter(Boolean).join(" ");

  const mergedOnRow: TableProps<T>["onRow"] =
    rowExpandInteraction === "preset"
      ? (record) => {
          const user = onRow?.(record) ?? {};
          const key = getRecordKey(record, rowKey);
          return {
            ...user,
            onClick: (e) => {
              user.onClick?.(e);
              onSelectedRowKeyChange?.(key);
            },
            onDoubleClick: (e) => {
              user.onDoubleClick?.(e);
              onSelectedRowKeyChange?.(key);
              void onToggleExpand?.(record);
            },
            style: { cursor: "pointer", ...user.style },
          };
        }
      : onRow;

  const mergedOnChange: TableProps<T>["onChange"] = (pagination, filters, sorter, extra) => {
    onChange?.(pagination, filters, sorter, extra);
    if (!sortSpec || !onRemoteSort) return;
    if (Array.isArray(sorter)) return;
    const field = sorter.field != null ? String(sorter.field) : undefined;
    if (!field) {
      onRemoteSort({ columnKey: undefined, order: undefined });
      return;
    }
    const spec = sortSpec[field as K];
    if (spec?.mode !== "remote") return;
    onRemoteSort({
      columnKey: field as K,
      order: (sorter.order ?? undefined) as RemoteSortOrder,
    });
  };

  return (
    <Table<T>
      {...rest}
      rowKey={rowKey}
      className={mergedClassName}
      size="middle"
      tableLayout="fixed"
      components={{ header: { cell: ResizableHeaderCell } }}
      scroll={scrollX != null ? { x: scrollX } : undefined}
      onChange={mergedOnChange}
      onRow={mergedOnRow}
    />
  );
}
