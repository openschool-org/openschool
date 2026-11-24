import { CalendarOutlined } from "@ant-design/icons";
import type { MonthSummary } from "@/features/attendance/lib/monthlySummary";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import { formatMonthLong, todayISODate } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

const MISSED = ["late", "absent", "excused"] as const;

// One stat card per month, the same card the dashboards and portfolio use.
export default function AttendanceMonthCards({ months }: { months: MonthSummary[] }) {
  const { t } = useT();
  const thisMonth = todayISODate().slice(0, 7);
  return (
    <div className="os-stat-grid os-mb-0">
      {months.map((m) => {
        const others = MISSED.filter((s) => m[s] > 0).map((s) => `${translateValue(t, "status", s)} ${m[s]}`);
        const label = formatMonthLong(`${m.month}-01`) + (m.month === thisMonth ? ` · ${t("attendance.thisMonth")}` : "");
        return (
          <StatCard
            key={m.month}
            label={label}
            value={formatPercent(m.rate)}
            meta={[t("attendance.daysAttended", { attended: m.present + m.late, days: m.days }), ...others].join(" · ")}
            loading={false}
            Icon={CalendarOutlined}
          />
        );
      })}
    </div>
  );
}
