import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TimetableGrid from "@/features/timetable/components/TimetableGrid";
import TimetableByDay from "@/features/timetable/components/TimetableByDay";
import type { TimetableEntry } from "@/features/timetable/api/timetable";
import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";

const block: TimetableEntry = {
  id: "e1", timetable_id: "t1", day_of_week: 1, period_number: 1, subject_id: null, subject_name: null, teacher_id: null, teacher_name: null,
  classroom_id: null, classroom_name: null, option_block_id: "b1", option_block_name: "Basket 1",
};
const period = { id: "p1", period_number: 1, slot_type: "period", start_time: "07:30", end_time: "08:10" } as TimetablePeriod;

afterEach(cleanup);

describe("option block periods", () => {
  it("show the block name in the editor grid", () => {
    render(<TimetableGrid periods={[period]} entryAt={(d, p) => (d === 1 && p === 1 ? block : undefined)} editable={false} onOpenCell={() => {}} />);
    expect(screen.getByText("Basket 1")).toBeTruthy();
    expect(screen.getByText("Option block")).toBeTruthy();
  });

  it("show the block name as the subject in the day view", () => {
    render(<TimetableByDay entries={[block]} middle={{ key: "teacher", header: "Teacher", render: () => "-" }} getRowId={(e) => e.id} />);
    expect(screen.getByText("Basket 1")).toBeTruthy();
  });
});
