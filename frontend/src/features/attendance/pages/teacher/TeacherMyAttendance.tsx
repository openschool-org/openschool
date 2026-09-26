import { STAFF_ATTENDANCE_STYLES } from "@/shared/lib/constants/attendance";
import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { ChevronLeft, ChevronRight, CheckmarkFilled, CloseFilled, Time, Renew } from "@carbon/icons-react";
import { useMyStaffAttendanceHistory } from "@/features/attendance/queries/useStaffAttendance";
import type { StaffAttendanceStatus } from "@/features/attendance/api/staffAttendance";
import DataGrid from "@/shared/ui/DataGrid";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";

const STATUS_ICONS: Record<StaffAttendanceStatus, typeof CheckmarkFilled> = {
  present: CheckmarkFilled,
  absent: CloseFilled,
  late: Time,
  leave: Renew,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function TeacherMyAttendance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: records, isLoading, isError } = useMyStaffAttendanceHistory(year, month);

  const goPrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); } else { setMonth((m) => m - 1); }
  };
  const goNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); } else { setMonth((m) => m + 1); }
  };

  const counts = (records ?? []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StaffAttendanceStatus, number>,
  );

  const sorted = [...(records ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My attendance</h1>
          <p className="os-page__subtitle">Your own attendance record - marked by an administrator</p>
        </div>
      </div>

      <div className="os-section os-mb-6">
        <div className="os-section__header os-flex os-items-center os-gap-3">
          <Button hasIconOnly iconDescription="Previous month" renderIcon={ChevronLeft} kind="ghost" size="sm" onClick={goPrevMonth} />
          <h2 className="os-section__title os-min-w-10 os-text-center">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Button hasIconOnly iconDescription="Next month" renderIcon={ChevronRight} kind="ghost" size="sm" onClick={goNextMonth} />
        </div>

        <div className="os-section__body os-flex os-gap-4 os-wrap">
          {(Object.keys(STAFF_ATTENDANCE_STYLES) as StaffAttendanceStatus[]).map((status) => {
            const cfg = { ...STAFF_ATTENDANCE_STYLES[status], Icon: STATUS_ICONS[status] };
            return (
              <div
                key={status} className="os-flex-basis-8 os-py-3h os-px-4 os-rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <p className="os-mt-0 os-mx-0 os-mb-1 os-text-2xs os-fw-600 os-uppercase os-tracking" style={{ color: cfg.color }}>
                  {cfg.label}
                </p>
                <p className="os-m-0 os-text-2xl os-fw-300" style={{ color: cfg.color }}>{counts[status] ?? 0}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="os-section">
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <EmptyState title="Could not load attendance" description="Please try again later." />
        ) : sorted.length === 0 ? (
          <EmptyState title="No attendance marked yet" description="No attendance has been recorded for you this month." />
        ) : (
          <DataGrid
            rows={sorted}
            getRowId={(r) => r.id}
            columns={[
              { key: "date", header: "Date", render: (r) => <span className="os-table__mono">{r.date}</span> },
              {
                key: "status",
                header: "Status",
                render: (r) => {
                  const cfg = STAFF_ATTENDANCE_STYLES[r.status];
                  return <Tag renderIcon={STATUS_ICONS[r.status]} size="sm" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</Tag>;
                },
              },
              { key: "note", header: "Note", render: (r) => <span className="os-table__muted">{r.note ?? "-"}</span> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
