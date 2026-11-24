import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WeeklyTimetable from "@/features/timetable/components/WeeklyTimetable";
import type { TimetableEntry } from "@/features/timetable/api/timetable";
import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";

const block: TimetableEntry = {
  id: "e1", timetable_id: "t1", day_of_week: 1, period_number: 1, subject_id: null, subject_name: null, teacher_id: null, teacher_name: null,
  classroom_id: null, classroom_name: null, option_block_id: "b1", option_block_name: "Basket 1",
};
const period = { id: "p1", period_number: 1, slot_type: "period", start_time: "07:30", end_time: "08:10" } as TimetablePeriod;

afterEach(cleanup);

describe("option block periods", () => {
  it("show the block name and say it is an option block", () => {
    render(<WeeklyTimetable entries={[block]} periods={[period]} />);
    expect(screen.getByText("Basket 1")).toBeTruthy();
    expect(screen.getByText("Option block")).toBeTruthy();
  });

  it("show the block name as the subject in the weekly view", () => {
    render(<WeeklyTimetable entries={[block]} />);
    expect(screen.getByText("Basket 1")).toBeTruthy();
  });
});

describe("weekly timetable", () => {
  it("shows period times and the interval as its own row", () => {
    const interval = { id: "i", sort_order: 2, period_number: null, slot_type: "interval", start_time: "10:30:00", end_time: "10:50:00" } as TimetablePeriod;
    const entry = { ...block, option_block_id: null, option_block_name: null, subject_name: "Chemistry", teacher_name: "B.M.S.D.N. Kumari" };
    render(<WeeklyTimetable entries={[entry]} periods={[period, interval]} detail={(e) => e.teacher_name} />);
    expect(screen.getByText("P1")).toBeTruthy();
    expect(screen.getByText("07.30-08.10 a.m.")).toBeTruthy();
    expect(screen.getByText("10.30-10.50 a.m.")).toBeTruthy();
    expect(screen.getByText("Interval")).toBeTruthy();
    expect(screen.getByText("Chemistry")).toBeTruthy();
    expect(screen.getByText("B.M.S.D.N. Kumari")).toBeTruthy();
  });
});

describe("subject colours", () => {
  it("give 15 different subjects 15 different colours, and a repeated subject the same one", () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      ...block, id: `e${i}`, option_block_id: null, option_block_name: null,
      subject_name: `Subject ${String(i).padStart(2, "0")}`, day_of_week: (i % 5) + 1, period_number: Math.floor(i / 5) + 1,
    }));
    entries.push({ ...entries[0], id: "repeat", day_of_week: 5, period_number: 8 });
    const { container } = render(<WeeklyTimetable entries={entries} />);
    const colourOf = (el: Element) => [...el.classList].find((c) => /^is-c\d+$/.test(c));
    const blocks = [...container.querySelectorAll(".os-tt__block")];
    const bySubject = new Map(blocks.map((b) => [b.textContent, colourOf(b)]));
    expect(new Set(bySubject.values()).size).toBe(15);
    const subject00 = blocks.filter((b) => b.textContent === "Subject 00").map(colourOf);
    expect(subject00).toHaveLength(2);
    expect(subject00[0]).toBe(subject00[1]);
  });
});

describe("practicals and library periods", () => {
  it("name a lab period as a practical with its room, and a room-only period by the room", () => {
    const lab = { ...block, id: "lab", option_block_id: null, option_block_name: null, subject_name: "Chemistry", classroom_name: "Chemistry Lab", classroom_type: "lab" };
    const library = { ...block, id: "lib", period_number: 2, option_block_id: null, option_block_name: null, classroom_name: "Main Library", classroom_type: "eca" };
    render(<WeeklyTimetable entries={[lab, library]} />);
    expect(screen.getByText("Chemistry Practical")).toBeTruthy();
    expect(screen.getByText("Chemistry Lab")).toBeTruthy();
    expect(screen.getByText("Main Library")).toBeTruthy();
  });
});

describe("editor mode", () => {
  it("offers + Add in empty cells and reports the clicked cell", () => {
    const clicks: [number, number][] = [];
    render(<WeeklyTimetable entries={[]} periods={[period]} showToday={false} onCellClick={(d, p) => clicks.push([d, p])} />);
    const adds = screen.getAllByText("+ Add");
    expect(adds).toHaveLength(5);
    fireEvent.click(adds[2]);
    expect(clicks).toEqual([[3, 1]]);
  });
});
