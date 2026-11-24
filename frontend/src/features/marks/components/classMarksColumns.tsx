import Pill from "@/shared/ui/Pill";
import { Checkbox, InputNumber } from "antd";
import type { ClassMarkRow } from "@/features/marks/api/termMark";
import type { GridColumn } from "@/shared/ui/DataGrid";
import type { ClassMarkEntry } from "@/features/marks/hooks/useClassMarksEntry";

// Editable marks, out-of and absent columns for the admin class marks grid.
export function classMarksColumns(
  draft: Record<string, ClassMarkEntry>,
  update: (studentId: string, patch: Partial<ClassMarkEntry>) => void,
): GridColumn<ClassMarkRow>[] {
  return [
    { key: "index", header: "Index no.", render: (r) => <span className="os-table__mono">{r.index_number}</span> },
    {
      key: "student",
      header: "Student",
      render: (r) => <>{r.student_name}{draft[r.student_id]?.is_absent && <span className="os-ml-2"><Pill tone="danger">Absent</Pill></span>}</>,
    },
    {
      key: "marks",
      header: "Marks",
      render: (r) => (
        <InputNumber
          id={`marks-${r.student_id}`}
          aria-label={`Marks for ${r.student_name}`}
          size="small"
          className="os-w-8"
          min={0}
          max={draft[r.student_id]?.max_marks ?? 100}
          value={draft[r.student_id]?.marks ?? 0}
          disabled={draft[r.student_id]?.is_absent ?? false}
          onChange={(v) => update(r.student_id, { marks: typeof v === "number" ? v : 0 })}
        />
      ),
    },
    {
      key: "max",
      header: "Out of",
      render: (r) => (
        <InputNumber
          id={`max-marks-${r.student_id}`}
          aria-label={`Maximum marks for ${r.student_name}`}
          size="small"
          className="os-w-8"
          min={1}
          value={draft[r.student_id]?.max_marks ?? 100}
          onChange={(v) => update(r.student_id, { max_marks: typeof v === "number" ? v : 100 })}
        />
      ),
    },
    {
      key: "absent",
      header: "Absent",
      render: (r) => (
        <Checkbox
          id={`absent-${r.student_id}`}
          checked={draft[r.student_id]?.is_absent ?? false}
          onChange={(e) => update(r.student_id, { is_absent: e.target.checked, marks: e.target.checked ? 0 : draft[r.student_id]?.marks ?? 0 })}
        >
          AB
        </Checkbox>
      ),
    },
  ];
}
