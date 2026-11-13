import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { AttendanceNoteCell, AttendanceStatusCell } from "@/features/attendance/components/AttendanceCells";
import { expectNoA11yViolations } from "@/shared/testing/a11y";

describe("Attendance marking cells", () => {
  it("has no accessibility violations, unmarked", async () => {
    const { container } = render(
      <div>
        <AttendanceStatusCell status={null} readOnly={false} onMark={() => {}} />
        <AttendanceNoteCell studentName="Jane Doe" status={null} note="" readOnly={false} onNoteChange={() => {}} />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations, absent with a note input", async () => {
    const { container } = render(
      <div>
        <AttendanceStatusCell status="absent" readOnly={false} onMark={() => {}} />
        <AttendanceNoteCell studentName="Jane Doe" status="absent" note="" readOnly={false} onNoteChange={() => {}} />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations, read-only and marked", async () => {
    const { container } = render(
      <div>
        <AttendanceStatusCell status="present" readOnly onMark={() => {}} />
        <AttendanceNoteCell studentName="Jane Doe" status="present" note="" readOnly onNoteChange={() => {}} />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
