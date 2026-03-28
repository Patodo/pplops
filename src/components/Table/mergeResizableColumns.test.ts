import type { ColumnsType } from "antd/es/table";
import type { SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import { mergeResizableColumns } from "./mergeResizableColumns";

type Row = { id: string };

describe("mergeResizableColumns", () => {
  const baseColumns: ColumnsType<Row> = [
    { key: "a", title: "A" },
    { key: "b", title: "B" },
    { key: "actions", title: "Actions", width: 120 },
  ];

  it("orders columns by visibleKeys then pinned right keys", () => {
    const setColumnWidths = vi.fn();
    const result = mergeResizableColumns<Row, "a" | "b">({
      baseColumns,
      visibleKeys: ["b", "a"],
      columnWidths: { a: 100, b: 200 },
      setColumnWidths,
      pinnedRightKeys: ["actions"],
    });
    expect(result.map((c) => String(c.key))).toEqual(["b", "a", "actions"]);
  });

  it("adds onHeaderCell with width from columnWidths", () => {
    const setColumnWidths = vi.fn();
    const result = mergeResizableColumns<Row, "a" | "b">({
      baseColumns,
      visibleKeys: ["a"],
      columnWidths: { a: 150, b: 200 },
      setColumnWidths,
      pinnedRightKeys: ["actions"],
    });
    const aCol = result.find((c) => c.key === "a");
    expect(aCol?.width).toBe(150);
    const header = aCol?.onHeaderCell?.(aCol as never) as {
      width?: number;
      onResizeStop?: (w: number) => void;
    };
    expect(header).toMatchObject({ width: 150, onResizeStop: expect.any(Function) });
  });

  it("onResizeStop floors width and enforces minimum 80", () => {
    let widths: Record<string, number> = { a: 100 };
    const setColumnWidths = vi.fn((updater: SetStateAction<Record<string, number>>) => {
      widths = typeof updater === "function" ? updater(widths) : updater;
    });
    const narrowBase: ColumnsType<Row> = [{ key: "a", title: "A" }];
    const result = mergeResizableColumns<Row, "a">({
      baseColumns: narrowBase,
      visibleKeys: ["a"],
      columnWidths: widths as Record<"a", number>,
      setColumnWidths,
      pinnedRightKeys: [],
    });
    const col0 = result[0];
    const header = col0?.onHeaderCell?.(col0 as never) as {
      onResizeStop?: (w: number) => void;
    };
    header?.onResizeStop?.(40);
    expect(widths.a).toBe(80);
    header?.onResizeStop?.(90.7);
    expect(widths.a).toBe(90);
  });

  it("does not duplicate pinned columns when they appear in visibleKeys", () => {
    const setColumnWidths = vi.fn();
    const result = mergeResizableColumns<Row, "a" | "actions">({
      baseColumns,
      visibleKeys: ["a", "actions"],
      columnWidths: { a: 100, actions: 120 } as Record<"a" | "actions", number>,
      setColumnWidths,
      pinnedRightKeys: ["actions"],
    });
    const keys = result.map((c) => String(c.key));
    expect(keys.filter((k) => k === "actions").length).toBe(1);
    expect(keys[keys.length - 1]).toBe("actions");
  });
});
