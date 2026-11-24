import type { GridColumn } from "@/shared/ui/DataGrid";
import type { DailySession } from "@/features/attendance/api/attendance";
import { SessionActions, SessionStatus } from "@/features/attendance/components/SessionCells";

// canMark is false for a section head: they view and delete sessions but do not mark them.
export function sessionColumns(isAdmin: boolean, onDelete: (s: DailySession) => void, canMark = true): GridColumn<DailySession>[] {
  return [
    { key: "class", header: "Class", render: (s) => <span className="os-fw-600">{s.class_name}</span> },
    { key: "grade", header: "Grade", render: (s) => <span className="os-table__muted">{s.grade_name}</span> },
    { key: "teacher", header: "Teacher", render: (s) => <span className="os-table__muted">{s.teacher_name}</span> },
    { key: "records", header: "Records", render: (s) => <span className="os-table__muted">{s.marked_count} / {s.enrolled_count}</span> },
    { key: "status", header: "Status", render: (s) => <SessionStatus session={s} /> },
    { key: "actions", header: "Actions", align: "end", render: (s) => <SessionActions session={s} isAdmin={isAdmin} onDelete={onDelete} canMark={canMark} /> },
  ];
}
