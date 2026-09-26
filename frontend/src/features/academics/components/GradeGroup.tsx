import { Link } from "react-router";
import { Add, ArrowDown, ArrowUp, TrashCan, Warning } from "@carbon/icons-react";
import { AccordionItem, Button, IconButton, SkeletonIcon, SkeletonText, Tag } from "@carbon/react";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { gradeNameWarning } from "@/features/academics/lib/gradeName";

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
  open: boolean;
  onToggleOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditGrade: () => void;
  onDeleteGrade: () => void;
  onDeleteClass: (c: ClassWithDetails) => void;
  streamName: (id: string | null) => string | null;
  teacherName: (id: string | null) => string | null;
}

// One grade in the Grades & Classes accordion with its current-year classes.
export default function GradeGroup(p: Props) {
  const { grade, index, isLast, busy, classes } = p;
  const warning = gradeNameWarning(grade.name, p.from, p.to);

  const columns: GridColumn<ClassWithDetails>[] = [
    { key: "name", header: "Class", render: (c) => <Link to={`/classes/${c.id}`} className="os-table__link">{c.name}</Link> },
    { key: "teacher", header: "Form teacher", render: (c) => <span className="os-table__muted">{p.teacherName(c.form_teacher_id) ?? "No form teacher"}</span> },
    { key: "stream", header: "Stream", render: (c) => p.streamName(c.stream_id) && <Tag type="blue" size="sm">{p.streamName(c.stream_id)}</Tag> },
    { key: "medium", header: "Medium", render: (c) => c.medium_name && <Tag type="purple" size="sm">{c.medium_name}</Tag> },
    { key: "room", header: "Home classroom", render: (c) => <span className="os-table__muted">{c.home_classroom_name ?? "-"}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (c) => (
        <IconButton label="Delete" kind="ghost" size="sm" onClick={() => p.onDeleteClass(c)}>
          <TrashCan />
        </IconButton>
      ),
    },
  ];

  const title = (
    <div className="os-flex os-items-center os-gap-3 os-wrap">
      <span className="os-w-1t os-h-1t os-rounded-md os-bg-accent-light os-c-accent os-text-sm os-fw-600 os-flex os-items-center os-justify-center os-shrink-0">
        {index + 1}
      </span>
      <span className="os-fw-600 os-text-md os-c-primary">{grade.name}</span>
      {warning && (
        <span className="os-inline-flex os-items-center os-gap-1 os-text-xs os-c-warning-text">
          <Warning size={14} className="os-fill-warning-text" />
          {warning}
        </span>
      )}
      <Tag type="gray" size="sm">
        {classes.length} {classes.length === 1 ? "class" : "classes"}
      </Tag>
    </div>
  );

  return (
    <AccordionItem title={title} open={p.open} onHeadingClick={p.onToggleOpen} aria-label={`${grade.name} - ${classes.length} classes`}>
      <div className="os-flex os-justify-end os-gap-2 os-mb-4">
        <Button hasIconOnly kind="ghost" size="sm" iconDescription="Move up" renderIcon={ArrowUp} disabled={index === 0 || busy} onClick={p.onMoveUp} />
        <Button hasIconOnly kind="ghost" size="sm" iconDescription="Move down" renderIcon={ArrowDown} disabled={isLast || busy} onClick={p.onMoveDown} />
        <Button kind="ghost" size="sm" disabled={busy} onClick={p.onEditGrade}>Edit grade</Button>
        <Button kind="danger--ghost" size="sm" disabled={busy} onClick={p.onDeleteGrade}>Delete grade</Button>
      </div>

      {classes.length === 0 ? (
        <p className="os-text-sm os-c-tertiary os-mt-0 os-mx-0 os-mb-4">No classes yet for this grade.</p>
      ) : (
        <DataGrid rows={classes} columns={columns} getRowId={(c) => c.id} pagination={false} />
      )}

      <div className="os-mt-3">
        <Button kind="ghost" size="sm" renderIcon={Add} as={Link} to={`/classes/new?grade_id=${grade.id}`}>
          Add class to {grade.name}
        </Button>
      </div>
    </AccordionItem>
  );
}
