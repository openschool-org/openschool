import { Checkbox, NumberInput, Tag } from "@carbon/react";
import type { Student } from "@/features/students/api/student";
import type { useMarksDraft } from "@/features/marks/hooks/useMarksDraft";

interface Props {
  students: Student[];
  subjectName: string;
  maxMarks: number;
  draft: ReturnType<typeof useMarksDraft>;
}

const marksInputId = (studentId: string) => `marks-${studentId}`;

// Editable roster; stays a plain table because every row holds form controls.
export default function MarksEntryTable({ students, subjectName, maxMarks, draft }: Props) {
  const focusRow = (index: number) => {
    const target = students[index];
    if (!target) return;
    document.getElementById(marksInputId(target.id))?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusRow(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusRow(index - 1);
    } else if (e.key.toLowerCase() === "a") {
      e.preventDefault();
      draft.setAbsent(students[index].id, true);
      focusRow(index + 1);
    }
  };

  return (
    <>
      <div className="os-marks-context-bar">
        <span><strong>{subjectName}</strong></span>
        <span>Max marks: <strong>{maxMarks}</strong></span>
        <span className="os-c-tertiary">Enter/↓ next row · ↑ previous row · A marks absent</span>
      </div>
      <table className="os-table os-table--sticky-head">
        <thead>
          <tr>
            <th className="os-w-3">#</th>
            <th>Student name</th>
            <th>Index number</th>
            <th className="os-w-8">Marks</th>
            <th className="os-w-5">Absent</th>
            <th className="os-w-7">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => {
            const row = draft.get(student.id);
            return (
              <tr key={student.id}>
                <td className="os-table__muted">{i + 1}</td>
                <td className="os-fw-500">{student.full_name}</td>
                <td className="os-table__mono">{student.index_number}</td>
                <td>
                  <NumberInput
                    id={marksInputId(student.id)}
                    label=""
                    min={0}
                    max={maxMarks}
                    value={row.marks}
                    disabled={row.isAbsent}
                    onChange={(_e, { value }) => draft.setMarks(student.id, Number(value))}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    size="sm"
                    hideSteppers
                  />
                </td>
                <td>
                  <Checkbox id={`absent-${student.id}`} labelText="AB" checked={row.isAbsent} onChange={(_e, { checked }) => draft.setAbsent(student.id, checked)} />
                </td>
                <td>
                  {row.isAbsent && <Tag type="red" size="sm">AB</Tag>}
                  {draft.isUnsaved(student.id) && <Tag type="high-contrast" size="sm">Unsaved</Tag>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
