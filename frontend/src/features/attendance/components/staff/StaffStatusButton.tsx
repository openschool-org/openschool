import { CheckmarkFilled, CloseFilled, Time, Renew } from "@carbon/icons-react";
import type { StaffAttendanceStatus } from "@/features/attendance/api/staffAttendance";
import { STAFF_ATTENDANCE_STYLES } from "@/shared/lib/constants/attendance";

// "Leave" reuses the "excused" palette with a staff-specific label.
const STATUS_ICONS: Record<StaffAttendanceStatus, typeof CheckmarkFilled> = {
  present: CheckmarkFilled,
  absent: CloseFilled,
  late: Time,
  leave: Renew,
};


interface Props {
  value: StaffAttendanceStatus;
  selected: boolean;
  onClick: () => void;
  personName: string;
}

export default function StaffStatusButton({ value, selected, onClick, personName }: Props) {
  const cfg = STAFF_ATTENDANCE_STYLES[value];
  const Icon = STATUS_ICONS[value];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${cfg.label}: ${personName}`}
      className={`os-staff-status os-py-1 os-px-3 os-text-xs ${selected ? "os-fw-600" : "os-fw-400"} os-pointer os-rounded-sm os-nowrap`}
      style={{ border: `1px solid ${selected ? cfg.border : "var(--os-border-subtle)"}`, background: selected ? cfg.bg : "var(--os-layer)", color: selected ? cfg.color : "var(--os-text-secondary)" }}
    >
      <Icon size={12} className="os-mr-1 os-align-middle" style={{ fill: selected ? cfg.color : "var(--os-text-tertiary)" }} />
      {cfg.label}
    </button>
  );
}
