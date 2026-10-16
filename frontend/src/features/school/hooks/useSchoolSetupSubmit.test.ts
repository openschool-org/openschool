import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useSchoolSetupSubmit } from "@/features/school/hooks/useSchoolSetupSubmit";
import { createDefaultAlStreams } from "@/features/school/setupConstants";

const m = vi.hoisted(() => ({
  school: vi.fn(),
  house: vi.fn(),
  grade: vi.fn(),
  year: vi.fn(),
  cls: vi.fn(),
  medium: vi.fn(),
  stream: vi.fn(),
  group: vi.fn(),
  room: vi.fn(),
}));

vi.mock("@/features/school/queries/useSchool", () => ({ useCreateSchool: () => ({ mutateAsync: m.school }) }));
vi.mock("@/features/school/queries/useHouses", () => ({ useCreateHouse: () => ({ mutateAsync: m.house }) }));
vi.mock("@/features/academics/queries/useGrades", () => ({ useCreateGrade: () => ({ mutateAsync: m.grade }) }));
vi.mock("@/features/school/queries/useAcademicYears", () => ({ useCreateAcademicYear: () => ({ mutateAsync: m.year }) }));
vi.mock("@/features/academics/queries/useClasses", () => ({
  useCreateClass: () => ({ mutateAsync: m.cls }),
  useCreateStream: () => ({ mutateAsync: m.stream }),
  useCreateStreamGroup: () => ({ mutateAsync: m.group }),
}));
vi.mock("@/features/curriculum/queries/useCurriculum", () => ({ useCreateMedium: () => ({ mutateAsync: m.medium }) }));
vi.mock("@/features/timetable/queries/useClassrooms", () => ({ useCreateClassroom: () => ({ mutateAsync: m.room }) }));

type Input = Parameters<typeof useSchoolSetupSubmit>[0];

const alOff = () => {
  const s = createDefaultAlStreams();
  for (const key of Object.keys(s) as (keyof typeof s)[]) s[key] = { ...s[key], enabled: false };
  return s;
};

const baseInput = (): Input => {
  const grade12 = alOff();
  grade12.science_physical = { enabled: true, code: "", sections: 2 };
  grade12.commerce = { enabled: true, code: "COM", sections: 1 };
  const grade13 = alOff();
  grade13.arts = { enabled: true, code: "", sections: 1 };
  return {
    school: { name: " Royal ", address: "Colombo", phone: "011", email: "a@b.lk", logo_url: "", school_type: "mixed", grade_from: 1, grade_to: 13 },
    houses: [{ name: "Red ", code: "", color: "#f00" }, { name: "  ", code: "", color: "#0f0" }],
    housesSkipped: false,
    orderedSelectedGrades: [10, 12],
    mediumsSkipped: false,
    mediumChecks: { Sinhala: true, Tamil: false },
    customMediums: ["French", " "],
    selectedMediumNames: ["Sinhala", "French"],
    yearLabel: "2025/26",
    classCapacity: 40,
    sectionsPerGrade: { 10: 2 },
    sectionMediums: { "10-1": "French" },
    alStreams: { 12: grade12, 13: grade13 },
    classesSkipped: false,
    roomsSkipped: false,
    facilityRooms: [{ id: "r1", group: "library", name: " Main ", capacity: 30 }, { id: "r2", group: "itLab", name: "", capacity: "" }],
  };
};

const submit = async (result: { current: ReturnType<typeof useSchoolSetupSubmit> }, skipRooms?: boolean) => {
  await act(async () => {
    const run = result.current.submitAll(skipRooms);
    await vi.runAllTimersAsync();
    await run;
  });
};

const classNames = () => m.cls.mock.calls.map(([d]) => d.name);

beforeEach(() => {
  vi.useFakeTimers();
  m.school.mockResolvedValue({});
  m.house.mockResolvedValue({});
  m.grade.mockImplementation(async (d: { name: string }) => ({ id: `g-${d.name}`, name: d.name }));
  m.year.mockResolvedValue({ id: "y1" });
  m.cls.mockResolvedValue({});
  m.medium.mockImplementation(async (d: { name: string }) => ({ id: `m-${d.name}` }));
  m.stream.mockImplementation(async (d: { name: string }) => ({ id: `s-${d.name}` }));
  m.group.mockImplementation(async (d: { data: { name: string } }) => ({ id: `grp-${d.data.name}` }));
  m.room.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("useSchoolSetupSubmit", () => {
  it("creates the whole setup in order with trimmed values", async () => {
    const { result } = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(result);

    expect(result.current.submitted).toBe(true);
    expect(result.current.submitError).toBeNull();
    expect(m.school).toHaveBeenCalledWith(expect.objectContaining({ name: "Royal", logo_url: undefined, grade_from: 1, grade_to: 13 }));
    expect(m.house).toHaveBeenCalledTimes(1);
    expect(m.house).toHaveBeenCalledWith({ name: "Red", code: undefined, color: "#f00" });
    // Picking grade 12 inside a 1-13 range also adds grade 13.
    expect(m.grade.mock.calls.map(([d]) => d)).toEqual([
      { name: "Grade 10", sort_order: 0 },
      { name: "Grade 12", sort_order: 1 },
      { name: "Grade 13", sort_order: 2 },
    ]);
    expect(m.medium.mock.calls.map(([d]) => d.name)).toEqual(["Sinhala", "French"]);
    expect(m.year).toHaveBeenCalledWith({
      label: "2025/26",
      start_date: "2025-01-01T00:00:00.000Z",
      end_date: "2025-12-31T00:00:00.000Z",
      is_current: true,
    });
    expect(m.stream.mock.calls.map(([d]) => d.name)).toEqual(["Science", "Commerce", "Arts"]);
    expect(m.group).toHaveBeenCalledWith({ streamId: "s-Science", data: { name: "Physical Science" } });
    expect(classNames()).toEqual(["10-A", "10-B", "12-M1", "12-M2", "12-COM1", "13-A1"]);
    expect(m.room).toHaveBeenCalledTimes(1);
    expect(m.room).toHaveBeenCalledWith({ name: "Main", code: "library", room_type: "eca", capacity: 30 });
  });

  it("tags classes with their section medium, defaulting to the first medium", async () => {
    const { result } = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(result);
    const byName = Object.fromEntries(m.cls.mock.calls.map(([d]) => [d.name, d]));
    expect(byName["10-A"].medium_id).toBe("m-Sinhala");
    expect(byName["10-B"].medium_id).toBe("m-French");
    expect(byName["12-M1"]).toMatchObject({ stream_id: "s-Science", stream_group_id: "grp-Physical Science", medium_id: "m-Sinhala", capacity: 40, academic_year_id: "y1" });
    expect(byName["12-COM1"]).toMatchObject({ stream_id: "s-Commerce", stream_group_id: null });
  });

  it("resumes after a failure without repeating finished work", async () => {
    m.cls.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(result);
    expect(result.current.submitError).not.toBeNull();
    expect(result.current.submitted).toBe(false);

    await submit(result);
    expect(result.current.submitted).toBe(true);
    expect(result.current.submitError).toBeNull();
    for (const fn of [m.school, m.house, m.year, m.medium, m.room]) expect(fn).toHaveBeenCalledTimes(fn === m.medium ? 2 : 1);
    expect(m.grade).toHaveBeenCalledTimes(3);
    expect(m.stream).toHaveBeenCalledTimes(3);
    // 10-A once, 10-B failed then retried, the rest once.
    expect(classNames()).toEqual(["10-A", "10-B", "10-B", "12-M1", "12-M2", "12-COM1", "13-A1"]);
  });

  it("retries a rate-limited request and gives up after three retries", async () => {
    const limited = { response: { status: 429 } };
    m.school.mockRejectedValueOnce(limited).mockResolvedValueOnce({});
    const first = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(first.result);
    expect(first.result.current.submitted).toBe(true);
    expect(m.school).toHaveBeenCalledTimes(2);

    m.school.mockReset().mockRejectedValue(limited);
    const second = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(second.result);
    expect(second.result.current.submitted).toBe(false);
    expect(m.school).toHaveBeenCalledTimes(4);
  });

  it("does not retry other errors", async () => {
    m.school.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(result);
    expect(m.school).toHaveBeenCalledTimes(1);
    expect(result.current.submitError).not.toBeNull();
    expect(m.grade).not.toHaveBeenCalled();
  });

  it("skips houses, mediums, classes and rooms when asked", async () => {
    const input = { ...baseInput(), housesSkipped: true, mediumsSkipped: true, classesSkipped: true, roomsSkipped: true };
    const { result } = renderHook(() => useSchoolSetupSubmit(input));
    await submit(result);
    expect(result.current.submitted).toBe(true);
    for (const fn of [m.house, m.medium, m.year, m.cls, m.stream, m.group, m.room]) expect(fn).not.toHaveBeenCalled();
    expect(m.grade).toHaveBeenCalledTimes(3);
  });

  it("skips classes when the year label is blank", async () => {
    const { result } = renderHook(() => useSchoolSetupSubmit({ ...baseInput(), yearLabel: "  " }));
    await submit(result);
    expect(m.year).not.toHaveBeenCalled();
    expect(m.cls).not.toHaveBeenCalled();
  });

  it("lets the rooms override win over stale skip state", async () => {
    const { result } = renderHook(() => useSchoolSetupSubmit(baseInput()));
    await submit(result, true);
    expect(m.room).not.toHaveBeenCalled();

    const other = renderHook(() => useSchoolSetupSubmit({ ...baseInput(), roomsSkipped: true }));
    await submit(other.result, false);
    expect(m.room).toHaveBeenCalledTimes(1);
  });

  it("does not add grade 13 when the school range stops at 12", async () => {
    const input = baseInput();
    input.school = { ...input.school, grade_to: 12 };
    const { result } = renderHook(() => useSchoolSetupSubmit(input));
    await submit(result);
    expect(m.grade.mock.calls.map(([d]) => d.name)).toEqual(["Grade 10", "Grade 12"]);
  });
});
