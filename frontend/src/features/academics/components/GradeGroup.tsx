import { Link } from "react-router";
import { Alert, Button, Card, Empty, Skeleton, Tag, Tooltip } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { gradeNameWarning } from "@/features/academics/lib/gradeName";
import MediumTag from "@/shared/ui/MediumTag";
import StreamTag from "@/shared/ui/StreamTag";
import { gradeBand } from "@/shared/lib/gradeBand";

export function GradeGroupSkeleton() {
  return (
    <Card type="inner" className="os-grade-card" title={<Skeleton.Input active size="small" />}>
      <Skeleton active title={false} paragraph={{ rows: 2 }} />
    </Card>
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
          <Tooltip title={`Edit ${c.name}`}>
            <Button type="text" size="small" aria-label={`Edit ${c.name}`} icon={<EditOutlined />} onClick={() => p.onEditClass(c)} />
          </Tooltip>
          <Tooltip title={`Delete ${c.name}`}>
            <Button type="text" size="small" danger aria-label={`Delete ${c.name}`} icon={<DeleteOutlined />} onClick={() => p.onDeleteClass(c)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <Card
      type="inner"
      // The header row is tinted by school section (primary, junior, O/L, A/L).
      className={`os-grade-card os-grade-band--${gradeBand(grade.name)}`}
      aria-label={`${grade.name} - ${classes.length} classes`}
      title={
        <div className="os-flex os-items-center os-gap-3 os-min-w-0">
          <span className="os-truncate">{grade.name}</span>
          <Tag variant="filled">{classes.length} {classes.length === 1 ? "class" : "classes"}</Tag>
        </div>
      }
      extra={
        <div className="os-flex os-items-center os-gap-1">
          <Tooltip title="Move up">
            <Button type="text" size="small" aria-label="Move up" icon={<ArrowUpOutlined />} disabled={index === 0 || busy} onClick={p.onMoveUp} />
          </Tooltip>
          <Tooltip title="Move down">
            <Button type="text" size="small" aria-label="Move down" icon={<ArrowDownOutlined />} disabled={isLast || busy} onClick={p.onMoveDown} />
          </Tooltip>
          <Button type="text" size="small" icon={<EditOutlined />} disabled={busy} onClick={p.onEditGrade}>Edit</Button>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={busy} onClick={p.onDeleteGrade}>Delete</Button>
        </div>
      }
    >
      {warning && <Alert type="warning" showIcon className="os-mb-4" title={warning} />}

      <div className="os-flex os-items-center os-justify-between os-gap-3 os-wrap os-mb-3">
        <div>
          <p className="os-m-0 os-fw-500 os-text-md os-c-primary">Classes in this grade</p>
          <p className="os-m-0 os-mt-1 os-text-sm os-c-tertiary">Manage form teachers, streams, rooms and enrolment.</p>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => p.onAddClass(grade.id)}>Add class</Button>
      </div>

      {classes.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No classes yet for this grade." />
      ) : (
        <DataGrid rows={classes} columns={columns} getRowId={(c) => c.id} pagination={false} />
      )}
    </Card>
  );
}
