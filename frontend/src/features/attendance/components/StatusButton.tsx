import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, SafetyCertificateOutlined } from "@ant-design/icons";
import { STATUS_STYLES, type Status } from "@/features/attendance/constants";

const STATUS_ICONS = { present: CheckCircleFilled, absent: CloseCircleFilled, late: ClockCircleOutlined, excused: SafetyCertificateOutlined };

export default function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: NonNullable<Status>;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = STATUS_ICONS[value];
  const className = selected ? `os-status-toggle os-status-toggle--selected os-status-toggle--${value}` : "os-status-toggle";
  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={selected}>
      <Icon />
      {STATUS_STYLES[value].label}
    </button>
  );
}
