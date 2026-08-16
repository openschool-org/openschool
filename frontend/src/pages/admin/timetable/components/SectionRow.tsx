import { Time, TrashCan } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import EntityCombobox from "../../../../components/common/EntityCombobox";
import type { GradeSection } from "../../../../services/timetable/gradeSection";
import type { Teacher } from "../../../../services/teacher";

export default function SectionRow({
  section,
  isLast,
  teachers,
  gradeName,
  onPeriods,
  onEdit,
  onDelete,
  onAssignHead,
}: {
  section: GradeSection;
  isLast: boolean;
  teachers: Teacher[] | undefined;
  gradeName: (id: string) => string;
  onPeriods: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssignHead: (teacherId: string) => void;
}) {
  const s = section;
  return (
    <div style={{ padding: "1rem 1.5rem", borderBottom: isLast ? "none" : "1px solid #e0e0e0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Time size={16} style={{ fill: "#406AAF" }} />
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</span>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
            Interval {s.interval_start_time}–{s.interval_end_time}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button kind="ghost" size="sm" onClick={onPeriods}>
            Periods
          </Button>
          <Button kind="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button kind="ghost" size="sm" renderIcon={TrashCan} iconDescription="Delete" hasIconOnly onClick={onDelete} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
        {s.grade_ids.length === 0 ? (
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>No grades assigned</span>
        ) : (
          s.grade_ids.map((gid) => (
            <Tag key={gid} type="teal" size="sm">
              {gradeName(gid)}
            </Tag>
          ))
        )}
      </div>

      <div style={{ width: "20rem" }}>
        <EntityCombobox
          id={`section-head-${s.id}`}
          items={teachers ?? []}
          selectedId={s.section_head_teacher_id ?? ""}
          onSelect={onAssignHead}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
          labelText="Section Head"
          placeholder="Search teachers…"
        />
      </div>
    </div>
  );
}
