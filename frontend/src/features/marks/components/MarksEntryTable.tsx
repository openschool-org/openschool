import { Checkbox, InputNumber, Tag } from "antd";
import type { Student } from "@/features/students/api/student";
import type { useMarksDraft } from "@/features/marks/hooks/useMarksDraft";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { displayName } from "@/shared/lib/name";

interface Props {
  students: Student[];
  subjectName: string;
  maxMarks: number;
  draft: ReturnType<typeof useMarksDraft>;
}

const marksInputId = (studentId: string) => `marks-${studentId}`;
// Top bar (3.5rem) plus the marks context bar (2.5rem), so the header row pins just below them.
const STICKY_OFFSET = 96;

// Editable roster with keyboard entry: Enter/↓ next row, ↑ previous row, A marks absent.
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

  const position = new Map(students.map((st, i) => [st.id, i]));

  const columns: GridColumn<Student>[] = [
    { key: "n", header: "#", render: (st) => <span className="os-table__muted">{(position.get(st.id) ?? 0) + 1}</span> },
    { key: "name", header: "Student name", render: (st) => <span className="os-fw-500" title={st.full_name}>{displayName(st)}</span> },
    { key: "index", header: "Index number", render: (st) => <span className="os-table__mono">{st.index_number}</span> },
    {
      key: "marks",
      header: "Marks",
      render: (st) => {
        const row = draft.get(st.id);
        return (
          <InputNumber
            id={marksInputId(st.id)}
            aria-label={`Marks for ${displayName(st)}`}
            size="small"
            controls={false}
            className="os-w-8"
            min={0}
            max={maxMarks}
            value={row.marks}
            disabled={row.isAbsent}
            onChange={(v) => draft.setMarks(st.id, typeof v === "number" ? v : 0)}
            onKeyDown={(e) => handleKeyDown(e, position.get(st.id) ?? 0)}
          />
        );
      },
    },
    {
      key: "absent",
      header: "Absent",
      render: (st) => (
        <Checkbox id={`absent-${st.id}`} checked={draft.get(st.id).isAbsent} onChange={(e) => draft.setAbsent(st.id, e.target.checked)}>
          AB
        </Checkbox>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (st) => (
        <span className="os-flex os-gap-1">
          {draft.get(st.id).isAbsent && <Tag color="error" variant="filled">AB</Tag>}
          {draft.isUnsaved(st.id) && <Tag color="processing" variant="filled">Unsaved</Tag>}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="os-marks-context-bar">
        <span><strong>{subjectName}</strong></span>
        <span>Max marks: <strong>{maxMarks}</strong></span>
        <span className="os-c-tertiary">Enter/↓ next row · ↑ previous row · A marks absent</span>
      </div>
      <DataGrid rows={students} columns={columns} getRowId={(st) => st.id} pagination={false} noHover stickyOffset={STICKY_OFFSET} />
    </>
  );
}
