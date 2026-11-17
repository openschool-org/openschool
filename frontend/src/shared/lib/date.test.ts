import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateOnly,
  formatDayGroup,
  fromYmd,
  isDateRangeInvalid,
  isLockedAfter24Hours,
  toYmd,
  todayISODate,
} from "@/shared/lib/date";

afterEach(() => {
  vi.useRealTimers();
});

describe("toYmd / fromYmd", () => {
  it("formats a local date with zero padding", () => {
    expect(toYmd(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toYmd(undefined)).toBe("");
  });

  it("parses YYYY-MM-DD as a local date", () => {
    const d = fromYmd("2026-03-09");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(9);
  });

  it("returns undefined for empty or invalid input", () => {
    expect(fromYmd("")).toBeUndefined();
    expect(fromYmd(null)).toBeUndefined();
    expect(fromYmd("not a date")).toBeUndefined();
  });
});

describe("todayISODate", () => {
  it("reads the clock at call time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 23, 59));
    expect(todayISODate()).toBe("2026-11-16");
    vi.setSystemTime(new Date(2026, 10, 17, 0, 1));
    expect(todayISODate()).toBe("2026-11-17");
  });
});

describe("isDateRangeInvalid", () => {
  it("is false until both dates are set", () => {
    expect(isDateRangeInvalid("", "2026-01-01")).toBe(false);
    expect(isDateRangeInvalid("2026-01-01", "")).toBe(false);
  });

  it("is true when end is on or before start", () => {
    expect(isDateRangeInvalid("2026-01-02", "2026-01-02")).toBe(true);
    expect(isDateRangeInvalid("2026-01-02", "2026-01-01")).toBe(true);
    expect(isDateRangeInvalid("2026-01-02", "2026-01-03")).toBe(false);
  });
});

describe("isLockedAfter24Hours", () => {
  it("locks only after a full day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
    expect(isLockedAfter24Hours(null)).toBe(false);
    expect(isLockedAfter24Hours("2026-11-15T13:00:00Z")).toBe(false);
    expect(isLockedAfter24Hours("2026-11-15T11:00:00Z")).toBe(true);
  });
});

describe("formatDate / formatDateOnly", () => {
  it("shows a dash for missing or invalid input", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("garbage")).toBe("-");
    expect(formatDateOnly(undefined)).toBe("-");
  });

  it("keeps the calendar day of a date with a midnight UTC time", () => {
    expect(formatDateOnly("2026-04-14T00:00:00Z")).toBe("2026-04-14");
    expect(formatDateOnly("2026-04-14")).toBe("2026-04-14");
  });

  it("formats Date objects", () => {
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("formatDayGroup", () => {
  const words = { today: "Today", yesterday: "Yesterday" };

  it("labels today and yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 10, 0));
    expect(formatDayGroup(new Date(2026, 10, 16, 8, 0), words)).toBe("Today");
    expect(formatDayGroup(new Date(2026, 10, 15, 22, 0), words)).toBe("Yesterday");
    expect(formatDayGroup(new Date(2026, 10, 10), words)).not.toMatch(/Today|Yesterday/);
    expect(formatDayGroup(null, words)).toBe("-");
  });
});
