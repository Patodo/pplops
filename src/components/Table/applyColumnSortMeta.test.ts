import type { ColumnsType } from "antd/es/table";
import { describe, expect, it } from "vitest";
import { applyColumnSortMeta, type ColumnSortSpec } from "./applyColumnSortMeta";

type Row = { name: string; age: number };
type ColKey = "name" | "age";

const baseColumns: ColumnsType<Row> = [
  { key: "name", title: "Name" },
  { key: "age", title: "Age" },
  { key: "extra", title: "X" },
];

describe("applyColumnSortMeta", () => {
  it("returns the same columns when sortSpec is empty", () => {
    const out = applyColumnSortMeta<Row, ColKey>({
      columns: baseColumns,
      sortSpec: {},
    });
    expect(out).toBe(baseColumns);
  });

  it("returns the same columns when sortSpec is undefined", () => {
    const out = applyColumnSortMeta<Row, ColKey>({ columns: baseColumns });
    expect(out).toBe(baseColumns);
  });

  it("leaves columns without key unchanged", () => {
    const cols: ColumnsType<Row> = [{ title: "NoKey" }, { key: "name", title: "Name" }];
    const spec: ColumnSortSpec<ColKey, Row> = { name: { mode: "client" } };
    const out = applyColumnSortMeta({ columns: cols, sortSpec: spec });
    expect(out[0]).toEqual(cols[0]);
    expect(out[1]).toMatchObject({ key: "name", sorter: true });
  });

  it("applies client mode with sorter true when compare is omitted", () => {
    const spec: ColumnSortSpec<ColKey, Row> = { name: { mode: "client" } };
    const out = applyColumnSortMeta({ columns: baseColumns, sortSpec: spec });
    const nameCol = out.find((c) => c.key === "name");
    expect(nameCol).toMatchObject({ sorter: true });
    expect(out.find((c) => c.key === "age")).toEqual(baseColumns[1]);
  });

  it("applies client mode with custom compare", () => {
    const compare = (a: Row, b: Row) => a.age - b.age;
    const spec: ColumnSortSpec<ColKey, Row> = { age: { mode: "client", compare } };
    const out = applyColumnSortMeta({ columns: baseColumns, sortSpec: spec });
    const ageCol = out.find((c) => c.key === "age");
    expect(ageCol?.sorter).toBe(compare);
  });

  it("applies remote mode with sortOrder only for active column", () => {
    const spec: ColumnSortSpec<ColKey, Row> = {
      name: { mode: "remote" },
      age: { mode: "remote" },
    };
    const out = applyColumnSortMeta({
      columns: baseColumns,
      sortSpec: spec,
      remoteSort: { columnKey: "name", order: "ascend" },
    });
    expect(out.find((c) => c.key === "name")).toMatchObject({
      sorter: true,
      sortOrder: "ascend",
    });
    expect(out.find((c) => c.key === "age")).toMatchObject({
      sorter: true,
      sortOrder: undefined,
    });
  });

  it("clears remote sortOrder when remoteSort columnKey does not match", () => {
    const spec: ColumnSortSpec<ColKey, Row> = { name: { mode: "remote" } };
    const out = applyColumnSortMeta({
      columns: baseColumns,
      sortSpec: spec,
      remoteSort: { columnKey: undefined, order: undefined },
    });
    expect(out.find((c) => c.key === "name")).toMatchObject({
      sortOrder: undefined,
    });
  });
});
