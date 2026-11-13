import { Button, Tag } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { GradeSection } from "@/features/timetable/api/gradeSection";

export default function SectionRow({
  section,
  gradeName,
  onPeriods,
  onEdit,
  onDelete,
}: {
  section: GradeSection;
  gradeName: (id: string) => string;
  onPeriods: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = section;
  return (
    <div className="os-list-row os-col os-items-stretch os-py-4 os-px-6">
      <div className="os-flex os-items-center os-justify-between os-mb-2">
        <div className="os-flex os-items-center os-gap-2">
          <ClockCircleOutlined className="os-c-accent" />
          <span className="os-fw-500 os-text-md">{s.name}</span>
          <span className="os-text-xs os-c-tertiary">
            Interval {s.interval_start_time}–{s.interval_end_time}
          </span>
        </div>
        <div className="os-flex os-gap-2">
          <Button size="small" onClick={onPeriods}>
            Periods
          </Button>
          <Button type="text" size="small" onClick={onEdit}>
            Edit
          </Button>
          <RemoveIconButton label="Delete" onClick={onDelete} />
        </div>
      </div>

      <div className="os-flex os-wrap os-gap-1h">
        {s.grade_ids.length === 0 ? (
          <span className="os-text-xs os-c-tertiary">No grades assigned</span>
        ) : (
          s.grade_ids.map((gid) => (
            <Tag key={gid} variant="filled">
              {gradeName(gid)}
            </Tag>
          ))
        )}
      </div>
    </div>
  );
}
