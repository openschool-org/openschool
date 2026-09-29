import { Link } from "react-router";
import { Add, ArrowDown, ArrowUp, Edit, TrashCan, Warning } from "@carbon/icons-react";
import { Button, IconButton, SkeletonIcon, SkeletonText, Tag } from "@carbon/react";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { gradeNameWarning } from "@/features/academics/lib/gradeName";
import MediumTag from "@/shared/ui/MediumTag";
import StreamTag from "@/shared/ui/StreamTag";

export function GradeGroupSkeleton() {
  return (
    <div className="os-border os-py-3h os-px-5 os-flex os-items-center os-gap-4">
      <SkeletonIcon />
      <SkeletonText width="20%" />
    </div>
  );
}

interface Props {
  grade: Grade;
  index: number;
  isLast: boolean;
  from: number | null;
  to: number | null;
  busy: boolean;
  classes: ClassWithDetails[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditGrade: () => void;
  onDeleteGrade: () => void;
  onDeleteClass: (c: ClassWithDetails) => void;
  onAddClass: (gradeId: string) => void;
  onEditClass: (c: ClassWithDetails) => void;
  streamName: (id: string | null) => string | null;
  streamGroupName: (id: string | null) => string | null;
  teacherName: (id: string | null) => string | null;
}

// One always-visible grade card with its current-year classes.
export default function GradeGroup(p: Props) {
  const { grade, index, isLast, busy, classes } = p;
  const warning = gradeNameWarning(grade.name, p.from, p.to);
  const isALGrade = /^(?:grade\s*)?(?:12|13)\b/i.test(grade.name.trim());

  const columns: GridColumn<ClassWithDetails>[] = [
    { key: "name", header: "Class", render: (c) => <Link to={`/classes/${c.id}`} className="os-table__link">{c.name}</Link> },
    { key: "teacher", header: "Form teacher", render: (c) => <span className="os-table__muted">{p.teacherName(c.form_teacher_id) ?? "No form teacher"}</span> },
    ...(isALGrade ? [{ key: "stream", header: "Stream", render: (c: ClassWithDetails) => p.streamName(c.stream_id) && <div className="os-flex os-items-center os-gap-1h os-wrap"><StreamTag name={p.streamName(c.stream_id)!} />{p.streamGroupName(c.stream_group_id) && <span className="os-text-xs os-c-tertiary">· {p.streamGroupName(c.stream_group_id)}</span>}</div> }] : []),
    { key: "medium", header: "Medium", render: (c) => c.medium_name && <MediumTag name={c.medium_name} /> },
    { key: "room", header: "Home classroom", render: (c) => <span className="os-table__muted">{c.home_classroom_name ?? "-"}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (c) => (
        <div className="os-flex os-items-center os-justify-end os-gap-1">
          <IconButton label={`Edit ${c.name}`} kind="ghost" size="sm" onClick={() => p.onEditClass(c)}>
            <Edit />
          </IconButton>
          <IconButton label={`Delete ${c.name}`} kind="ghost" size="sm" onClick={() => p.onDeleteClass(c)}>
            <TrashCan />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <article className="os-border os-rounded-md os-bg-layer os-overflow-hidden" aria-label={`${grade.name} - ${classes.length} classes`}>
      <header className="os-flex os-items-center os-gap-4 os-wrap os-py-4 os-px-5 os-bg-layer-hover os-border-b">
        <span className="os-w-2 os-h-2 os-rounded-md os-bg-accent os-c-layer os-text-sm os-fw-600 os-flex os-items-center os-justify-center os-shrink-0">
          {index + 1}
        </span>
        <div className="os-flex-1 os-min-w-0">
          <div className="os-flex os-items-center os-gap-2 os-wrap">
            <h3 className="os-m-0 os-fw-600 os-text-md os-c-primary">{grade.name}</h3>
            <Tag type="gray" size="sm">{classes.length} {classes.length === 1 ? "class" : "classes"}</Tag>
          </div>
          {warning && (
            <p className="os-m-0 os-mt-1 os-inline-flex os-items-center os-gap-1 os-text-xs os-c-warning-text">
              <Warning size={14} className="os-fill-warning-text" />
              {warning}
            </p>
          )}
        </div>
        <div className="os-flex os-items-center os-gap-1">
          <Button hasIconOnly kind="ghost" size="sm" iconDescription="Move up" renderIcon={ArrowUp} disabled={index === 0 || busy} onClick={p.onMoveUp} />
          <Button hasIconOnly kind="ghost" size="sm" iconDescription="Move down" renderIcon={ArrowDown} disabled={isLast || busy} onClick={p.onMoveDown} />
          <Button kind="ghost" size="sm" disabled={busy} onClick={p.onEditGrade}>Edit</Button>
          <Button kind="danger--ghost" size="sm" disabled={busy} onClick={p.onDeleteGrade}>Delete</Button>
        </div>
      </header>

      <div className="os-p-5">
        <div className="os-flex os-items-center os-justify-between os-gap-3 os-wrap os-mb-3">
          <div>
            <p className="os-m-0 os-fw-600 os-text-sm os-c-primary">Classes in this grade</p>
            <p className="os-m-0 os-mt-1 os-text-xs os-c-tertiary">Manage form teachers, streams, rooms and enrolment.</p>
          </div>
          <Button kind="tertiary" size="sm" renderIcon={Add} onClick={() => p.onAddClass(grade.id)}>
            Add class
          </Button>
        </div>

        {classes.length === 0 ? (
          <p className="os-text-sm os-c-tertiary os-mt-0 os-mx-0 os-mb-0">No classes yet for this grade.</p>
        ) : (
          <DataGrid rows={classes} columns={columns} getRowId={(c) => c.id} pagination={false} />
        )}
      </div>
    </article>
  );
}
