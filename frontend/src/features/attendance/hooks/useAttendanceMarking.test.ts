import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import type { AttendanceRecordRow } from "@/features/attendance/api/attendance";
import type { Student } from "@/features/students/api/student";

vi.mock("@/shared/ui/toast/useToast", () => ({ useToast: () => ({ showToast: () => {} }) }));

const students = [{ id: "s1" }, { id: "s2" }] as Student[];
const saved = [{ student_id: "s2", status: "late", note: "bus" }] as AttendanceRecordRow[];

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("useAttendanceMarking", () => {
  it("sends a late mark with its optional note", () => {
    const { result } = renderHook(() => useAttendanceMarking("session-a", [], students));
    act(() => result.current.mark("s1", "late"));
    act(() => result.current.setNote("s1", "  doctor visit "));
    expect(result.current.toRequest().records).toEqual([{ student_id: "s1", status: "late", note: "doctor visit" }]);
  });

  it("drops a note left over when the status changes to present", () => {
    const { result } = renderHook(() => useAttendanceMarking("session-b", [], students));
    act(() => result.current.mark("s1", "late"));
    act(() => result.current.setNote("s1", "bus delay"));
    act(() => result.current.mark("s1", "present"));
    expect(result.current.toRequest().records).toEqual([{ student_id: "s1", status: "present", note: undefined }]);
  });

  it("lists a removed saved mark as cleared", () => {
    const { result } = renderHook(() => useAttendanceMarking("session-c", saved, students));
    act(() => result.current.mark("s2", "late"));
    expect(result.current.toRequest()).toEqual({ records: [], cleared: ["s2"] });
  });
});
