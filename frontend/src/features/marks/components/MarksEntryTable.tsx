import { useState } from "react";
import { Checkbox, Input, InputNumber } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Student } from "@/features/students/api/student";
import type { useMarksDraft } from "@/features/marks/hooks/useMarksDraft";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { displayName } from "@/shared/lib/name";
import Pill from "@/shared/ui/Pill";
import GradeBadge from "@/features/marks/components/GradeBadge";

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
export default function MarksEntryTable({ students: roster, subjectName, maxMarks, draft }: Props) {
  const [search, setSearch] = useState("");
  const words = search.trim().toLowerCase();
  // Keyboard moves follow the filtered list, so a search narrows entry to the matching students.
  const students = words ? roster.filter((st) => `${displayName(st)} ${st.full_name} ${st.index_number}`.toLowerCase().includes(words)) : roster;
  const rosterNumber = new Map(roster.map((st, i) => [st.id, i + 1]));

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
    { key: "n", header: "#", render: (st) => <span className="os-table__muted">{rosterNumber.get(st.id)}</span> },
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
      // Same grade letters students and parents see.
      key: "grade",
      header: "Grade",
      render: (st) => {
        const row = draft.get(st.id);
        const percent = row.isAbsent || row.marks === null || row.marks === undefined || maxMarks <= 0 ? null : (row.marks / maxMarks) * 100;
        return percent === null ? <span className="os-table__muted">-</span> : <span className="os-flex os-items-center os-gap-2"><span className="os-table__muted">{Math.round(percent)}%</span><GradeBadge percent={percent} /></span>;
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
          {draft.get(st.id).isAbsent && <Pill tone="danger">Absent</Pill>}
          {draft.isUnsaved(st.id) && <Pill tone="info">Unsaved</Pill>}
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
        <Input
          className="os-max-w-px-280 os-ml-auto"
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          aria-label="Search students"
          placeholder="Search by name or index number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {students.length === 0 ? (
        <p className="os-m-0 os-py-6 os-px-6 os-c-tertiary">No students match "{search}".</p>
      ) : (
        <DataGrid rows={students} columns={columns} getRowId={(st) => st.id} pagination={false} noHover stickyOffset={STICKY_OFFSET} />
      )}
    </>
  );
}
