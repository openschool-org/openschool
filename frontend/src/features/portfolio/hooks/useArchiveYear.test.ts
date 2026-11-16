import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useArchiveYear } from "@/features/portfolio/hooks/useArchiveYear";

const years = [
  { id: "y24", label: "2024", start_date: "2024-01-01" },
  { id: "y25", label: "2025", start_date: "2025-01-01" },
  { id: "y26", label: "2026", start_date: "2026-01-01" },
];

vi.mock("@/features/school/queries/useAcademicYears", () => ({
  useCurrentAcademicYear: () => ({ data: years[2], isLoading: false }),
  useAcademicYears: () => ({ data: years }),
}));

afterEach(cleanup);

describe("useArchiveYear", () => {
  it("starts on the current year and offers it with past years, newest first", () => {
    const { result } = renderHook(() => useArchiveYear([{ id: "y24" }]));
    expect(result.current.viewingYearId).toBe("y26");
    expect(result.current.isArchive).toBe(false);
    expect(result.current.yearOptions).toEqual([
      { value: "y26", label: "2026 (current)" },
      { value: "y24", label: "2024" },
    ]);
  });

  it("switches to a read-only past year and back", () => {
    const { result } = renderHook(() => useArchiveYear([{ id: "y24" }]));
    act(() => result.current.selectYear("y24"));
    expect(result.current.isArchive).toBe(true);
    expect(result.current.viewingLabel).toBe("2024");
    act(() => result.current.selectYear(""));
    expect(result.current.viewingYearId).toBe("y26");
  });

  it("skips past-year ids that are not known academic years", () => {
    const { result } = renderHook(() => useArchiveYear([{ id: "gone" }]));
    expect(result.current.yearOptions.map((o) => o.value)).toEqual(["y26"]);
  });
});
