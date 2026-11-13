import { Card, Skeleton } from "antd";
import type { BalanceItem, LeaveBalance } from "@/features/leave/api/leave";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";

// One card per leave type: what is left, and what is used or waiting.
export default function LeaveBalanceCards({ balance, isLoading }: { balance?: LeaveBalance; isLoading: boolean }) {
  if (isLoading || !balance) return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  const cards = [...balance.items.filter((i) => i.leave_type === "casual" || i.leave_type === "sick"), balance.short_leave_month];
  const others = balance.items.filter((i) => i.entitlement === 0 && (i.used > 0 || i.pending > 0));
  return (
    <div className="os-grid os-grid-auto-200 os-gap-4">
      {[...cards, ...others].map((item) => (
        <Card key={item.leave_type} className="os-dash-stat">
          <p className="os-dash-stat__label">{LEAVE_TYPE_LABELS[item.leave_type]}{item.leave_type === "short" ? " this month" : ""}</p>
          <p className="os-dash-stat__value">{headline(item)}</p>
          <p className="os-dash-stat__meta">{meta(item)}</p>
        </Card>
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
