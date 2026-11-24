import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, MinusCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import StatCard from "@/features/reports/components/dashboard/StatCard";

interface Props {
  summary: { present: number; absent: number; late: number; excused: number; unmarked: number };
}

// Totals for the marking grid, in the same stat cards as every other page.
const CARDS = [
  { key: "present", label: "Present", Icon: CheckCircleOutlined },
  { key: "absent", label: "Absent", Icon: CloseCircleOutlined },
  { key: "late", label: "Late", Icon: ClockCircleOutlined },
  { key: "excused", label: "Excused", Icon: SafetyCertificateOutlined },
  { key: "unmarked", label: "Not marked", Icon: MinusCircleOutlined },
] as const;

export default function AttendanceSummaryCards({ summary }: Props) {
  return (
    <div className="os-stat-grid os-stat-grid--five">
      {CARDS.map(({ key, label, Icon }) => (
        <StatCard key={key} label={label} value={summary[key]} loading={false} Icon={Icon} />
      ))}
    </div>
  );
}
