import { useState } from "react";
import type { ComponentType } from "react";
import { Button, Tooltip } from "antd";
import { CarryOutOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useMyStaffAttendanceHistory } from "@/features/attendance/queries/useStaffAttendance";
import type { StaffAttendanceStatus } from "@/features/attendance/api/staffAttendance";
import AttendanceStatusBadge from "@/features/attendance/components/AttendanceStatusBadge";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import { STAFF_ATTENDANCE_STYLES } from "@/shared/lib/constants/attendance";
import DataGrid from "@/shared/ui/DataGrid";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import PageHeader from "@/shared/ui/PageHeader";
import SectionCard from "@/shared/ui/SectionCard";
import { formatLongDate, formatMonthLong } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";

const STATUS_ICONS: Record<StaffAttendanceStatus, ComponentType<{ className?: string }>> = {
  present: CheckCircleOutlined,
  absent: CloseCircleOutlined,
  late: ClockCircleOutlined,
  leave: CarryOutOutlined,
};

export default function TeacherMyAttendance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: records, isLoading, isError } = useMyStaffAttendanceHistory(year, month);

  const goPrevMonth = () => (month === 1 ? (setYear((y) => y - 1), setMonth(12)) : setMonth((m) => m - 1));
  const goNextMonth = () => (month === 12 ? (setYear((y) => y + 1), setMonth(1)) : setMonth((m) => m + 1));

  const rows = records ?? [];
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {} as Partial<Record<StaffAttendanceStatus, number>>);
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  const monthTitle = formatMonthLong(`${year}-${String(month).padStart(2, "0")}-01`);

  const navigator = (
    <div className="os-flex os-items-center os-gap-2">
      <Tooltip title="Previous month"><Button type="text" size="small" aria-label="Previous month" icon={<LeftOutlined />} onClick={goPrevMonth} /></Tooltip>
      <span className="os-fw-600 os-min-w-10 os-text-center">{monthTitle}</span>
      <Tooltip title="Next month"><Button type="text" size="small" aria-label="Next month" icon={<RightOutlined />} onClick={goNextMonth} /></Tooltip>
    </div>
  );

  return (
    <div className="os-page">
      <PageHeader title="My attendance" subtitle="Your own attendance record, marked by an administrator" />

      <div className="os-stat-grid">
        {(Object.keys(STAFF_ATTENDANCE_STYLES) as StaffAttendanceStatus[]).map((status) => (
          <StatCard
            key={status}
            label={STAFF_ATTENDANCE_STYLES[status].label}
            value={counts[status] ?? 0}
            meta={rows.length ? `${formatPercent(((counts[status] ?? 0) / rows.length) * 100)} of ${rows.length} marked days` : monthTitle}
            loading={isLoading}
            error={isError}
            Icon={STATUS_ICONS[status]}
          />
        ))}
      </div>

      <SectionCard title="Daily record" meta={navigator} flush>
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <EmptyState title="Could not load attendance" description="Please try again later." />
        ) : sorted.length === 0 ? (
          <EmptyState title="No attendance marked yet" description={`No attendance has been recorded for you in ${monthTitle}.`} />
        ) : (
          <DataGrid
            rows={sorted}
            getRowId={(r) => r.id}
            noHover
            columns={[
              {
                key: "date",
                header: "Date",
                render: (r) => (
                  <>
                    <span className="os-table__mono">{r.date}</span>
                    <span className="os-table__muted os-text-sm os-block">{formatLongDate(r.date)}</span>
                  </>
                ),
              },
              { key: "status", header: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
              { key: "note", header: "Note", render: (r) => <span className="os-table__muted">{r.note ?? "-"}</span> },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
