import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import type { CommonColumnConfig } from "./ColumnSettingsModal";
import { usePersistedColumnLayout } from "./usePersistedColumnLayout";

type K = "a" | "b";

const defaultColumns: CommonColumnConfig<K>[] = [
  { columnKey: "a", visible: true, order: 0 },
  { columnKey: "b", visible: false, order: 1 },
];

const defaultWidths: Record<K, number> = { a: 100, b: 200 };

describe("usePersistedColumnLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes from defaults when storage is empty", () => {
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    expect(result.current.columnConfigs).toEqual(defaultColumns);
    expect(result.current.columnWidths).toEqual(defaultWidths);
  });

  it("loads column configs from localStorage when valid", () => {
    const stored: CommonColumnConfig<K>[] = [
      { columnKey: "a", visible: false, order: 0 },
      { columnKey: "b", visible: true, order: 1 },
    ];
    localStorage.setItem("test.cols", JSON.stringify(stored));
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    expect(result.current.columnConfigs).toEqual(stored);
  });

  it("falls back to defaults when stored configs are empty array", () => {
    localStorage.setItem("test.cols", "[]");
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    expect(result.current.columnConfigs).toEqual(defaultColumns);
  });

  it("falls back to defaults when stored configs are invalid JSON", () => {
    localStorage.setItem("test.cols", "not-json");
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    expect(result.current.columnConfigs).toEqual(defaultColumns);
  });

  it("merges partial widths with defaults", () => {
    localStorage.setItem("test.widths", JSON.stringify({ a: 333 }));
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    expect(result.current.columnWidths).toEqual({ a: 333, b: 200 });
  });

  it("persists column config updates to localStorage", async () => {
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    act(() => {
      result.current.setColumnConfigs([{ columnKey: "a", visible: true, order: 1 }]);
    });
    await waitFor(() => {
      const raw = localStorage.getItem("test.cols");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual([{ columnKey: "a", visible: true, order: 1 }]);
    });
  });

  it("resetColumns restores default column configs", () => {
    localStorage.setItem(
      "test.cols",
      JSON.stringify([{ columnKey: "a", visible: false, order: 0 }]),
    );
    const { result } = renderHook(() =>
      usePersistedColumnLayout<K>({
        configStorageKey: "test.cols",
        widthStorageKey: "test.widths",
        defaultColumns,
        defaultWidths,
      }),
    );
    act(() => {
      result.current.resetColumns();
    });
    expect(result.current.columnConfigs).toEqual(defaultColumns);
  });
});
