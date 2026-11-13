import { Card } from "antd";

interface Props {
  summary: { present: number; absent: number; late: number; excused: number; unmarked: number };
}

// Dot colours are the attendance status tokens; they are runtime values, so they stay inline.
const CARDS = [
  { key: "present", label: "Present", color: "var(--os-status-present-border)" },
  { key: "absent", label: "Absent", color: "var(--os-status-absent-border)" },
  { key: "late", label: "Late", color: "var(--os-status-late-border)" },
  { key: "excused", label: "Excused", color: "var(--os-status-excused-border)" },
  { key: "unmarked", label: "Unmarked", color: "var(--os-border-strong)" },
] as const;

export default function AttendanceSummaryCards({ summary }: Props) {
  return (
    <div className="os-attendance-summary os-mb-6">
      {CARDS.map(({ key, label, color }) => (
        <Card key={key} className="os-dash-stat">
          <p className="os-dash-stat__label">
            <span className="os-dot os-w-0h os-h-0h" style={{ backgroundColor: color }} aria-hidden="true" />
            {label}
          </p>
          <p className="os-dash-stat__value">{summary[key]}</p>
        </Card>
      ))}
    </div>
  );
}
