import { Skeleton } from "antd";
import { CalendarOutlined, ClockCircleOutlined, CoffeeOutlined, MedicineBoxOutlined, SolutionOutlined, HeartOutlined, StopOutlined } from "@ant-design/icons";
import type { BalanceItem, LeaveBalance, LeaveType } from "@/features/leave/api/leave";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";

const ICONS: Record<LeaveType, typeof CalendarOutlined> = {
  casual: CoffeeOutlined,
  sick: MedicineBoxOutlined,
  duty: SolutionOutlined,
  maternity: HeartOutlined,
  no_pay: StopOutlined,
  short: ClockCircleOutlined,
};

// One stat card per leave type: what is left, and what is used or waiting.
export default function LeaveBalanceCards({ balance, isLoading }: { balance?: LeaveBalance; isLoading: boolean }) {
  if (isLoading || !balance) return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  const cards = [...balance.items.filter((i) => i.leave_type === "casual" || i.leave_type === "sick"), balance.short_leave_month];
  const others = balance.items.filter((i) => i.entitlement === 0 && (i.used > 0 || i.pending > 0));
  return (
    <div className="os-stat-grid os-mb-0">
      {[...cards, ...others].map((item) => (
        <StatCard
          key={item.leave_type}
          label={`${LEAVE_TYPE_LABELS[item.leave_type]}${item.leave_type === "short" ? " this month" : ""}`}
          value={headline(item)}
          meta={meta(item)}
          loading={false}
          Icon={ICONS[item.leave_type] ?? CalendarOutlined}
        />
      ))}
    </div>
  );
}

function headline(item: BalanceItem): string {
  if (item.remaining === null) return `${item.used} used`;
  return `${item.remaining} left`;
}

function meta(item: BalanceItem): string {
  const pending = item.pending > 0 ? `, ${item.pending} waiting` : "";
  if (item.leave_type === "short") return `${item.used} of ${item.entitlement} used`;
  if (item.entitlement === 0) return `days this year${pending}`;
  return `${item.used} of ${item.entitlement} days used${pending}`;
}
