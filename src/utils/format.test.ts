import { describe, expect, it } from "vitest";
import { expectedFormatDateUtc } from "@/test/domainSpec";
import { formatDate } from "./format";

/**
 * 规格：界面日期展示为 UTC 日历日 YYYY-MM-DD（与 domainSpec 中约定一致）。
 */
describe("formatDate", () => {
  it("将给定时刻格式化为 UTC 的 ISO 日期部分", () => {
    const d = new Date(Date.UTC(2026, 2, 29, 15, 30, 0));
    expect(formatDate(d)).toBe(expectedFormatDateUtc(d));
    expect(formatDate(d)).toBe("2026-03-29");
  });

  it("UTC 午夜对应的前一日在负时区外仍以 UTC 日期为准", () => {
    const utcMidnight = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(formatDate(utcMidnight)).toBe("2026-01-01");
  });
});
