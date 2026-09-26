import { STAFF_ATTENDANCE_STYLES } from "@/shared/lib/constants/attendance";
import { useState } from "react";
import { Tag, Toggle } from "@carbon/react";
import { CheckmarkFilled, CloseFilled, Time, Renew } from "@carbon/icons-react";
import {
  useStaffAttendanceByDate,
  useStaffAttendanceMonthlySummary,
  useMarkStaffAttendance,
} from "@/features/attendance/queries/useStaffAttendance";
import type { StaffAttendanceRow, StaffAttendanceStatus } from "@/features/attendance/api/staffAttendance";
import { todayISODate, formatLongDate } from "@/shared/lib/date";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import FilterBar from "@/shared/ui/FilterBar";
import DateField from "@/shared/ui/DateField";

// "Leave" reuses the "excused" attendance-status colors, same palette, different label for the staff-attendance domain.

const STATUS_ICONS: Record<StaffAttendanceStatus, typeof CheckmarkFilled> = {
  present: CheckmarkFilled,
  absent: CloseFilled,
  late: Time,
  leave: Renew,
};

// Client-side is fine here: the day's roster is one small, unpaginated list.
function filterStaff<T extends { full_name: string; employee_number?: string | null }>(rows: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.full_name.toLowerCase().includes(q) || (r.employee_number ?? "").toLowerCase().includes(q));
}

function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: StaffAttendanceStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STAFF_ATTENDANCE_STYLES[value];
  const Icon = STATUS_ICONS[value];
  return (
    <button
      onClick={onClick} className={`os-py-1 os-px-3 os-text-xs ${selected ? "os-fw-600" : "os-fw-400"} os-pointer os-rounded-sm os-nowrap`} style={{ border: `1px solid ${selected ? cfg.border : "var(--os-border-subtle)"}`, background: selected ? cfg.bg : "var(--os-layer)", color: selected ? cfg.color : "var(--os-text-secondary)" }}
    >
      <Icon size={12} className="os-mr-1 os-align-middle" style={{ fill: selected ? cfg.color : "var(--os-text-tertiary)" }} />
      {cfg.label}
    </button>
  );
}

function AttendanceTable({
  title,
  rows,
  onMark,
  markingId,
  emptyText,
}: {
  title: string;
  rows: StaffAttendanceRow[];
  onMark: (row: StaffAttendanceRow, status: StaffAttendanceStatus) => void;
  markingId: string | null;
  emptyText: string;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{title}</h2>
        <span className="os-text-xs os-c-tertiary">{rows.length} staff</span>
      </div>
      <table className="os-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee no.</th>
            <th>Attendance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.staff_id}>
              <td className="os-fw-500">{row.full_name}</td>
              <td className="os-table__mono">{row.employee_number}</td>
              <td>
                <div className={`os-flex os-gap-1h ${markingId === row.staff_id ? "os-opacity-50" : ""}`}>
                  {(["present", "late", "absent", "leave"] as const).map((s) => (
                    <StatusButton key={s} value={s} selected={row.status === s} onClick={() => onMark(row, s)} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="os-placeholder">
          <p>{emptyText}</p>
        </div>
      )}
    </div>
  );
}

function MonthlySummaryView({ year, month, search }: { year: number; month: number; search: string }) {
  const { data, isLoading, isError, refetch } = useStaffAttendanceMonthlySummary(year, month);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorMessage message="Could not load monthly summary." onRetry={refetch} />;

  const renderTable = (title: string, all: typeof data.teachers) => {
    const rows = filterStaff(all, search);
    return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{title}</h2>
      </div>
      <table className="os-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Present</th>
            <th>Late</th>
            <th>Absent</th>
            <th>Leave</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.staff_id}>
              <td className="os-fw-500">{r.full_name}</td>
              <td>{r.present_count}</td>
              <td>{r.late_count}</td>
              <td>{r.absent_count}</td>
              <td>{r.leave_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="os-placeholder"><p>No staff match your search.</p></div>}
    </div>
    );
  };

  return (
    <>
      {renderTable("Teachers", data.teachers)}
      {renderTable("Non-academic staff", data.non_academic_staff)}
    </>
  );
}

export default function StaffAttendance() {
  const [date, setDate] = useState(todayISODate());
  const [showMonthly, setShowMonthly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const emptyText = search ? "No staff match your search." : "No active staff.";

  const { data, isLoading, isError, refetch } = useStaffAttendanceByDate(date);
  const markAttendance = useMarkStaffAttendance();

  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  const handleMark = (row: StaffAttendanceRow, status: StaffAttendanceStatus, isTeacher: boolean) => {
    setMarkingId(row.staff_id);
    markAttendance.mutate(
      {
        ...(isTeacher ? { teacher_id: row.staff_id } : { non_academic_staff_id: row.staff_id }),
        date: new Date(date).toISOString(),
        status,
      },
      { onSettled: () => setMarkingId(null) },
    );
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Staff attendance</h1>
          <p className="os-page__subtitle">Mark daily staff attendance or view monthly summaries.</p>
        </div>
      </div>

      <div className="os-flex os-items-center os-gap-6 os-mb-6 os-wrap">
        {!showMonthly && (
          <DateField value={date} onChange={(ymd) => {
            if (ymd) setDate(ymd);
          }} id="staff-attendance-date" labelText="Date" />
        )}
        <Toggle
          id="staff-attendance-view-toggle"
          labelText="View"
          labelA="Daily"
          labelB="Monthly summary"
          toggled={showMonthly}
          onToggle={(checked) => setShowMonthly(checked)}
        />
        {!showMonthly && <Tag type="gray">{formatLongDate(date)}</Tag>}
      </div>

      <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Search by name or employee number" }} />

      {showMonthly ? (
        <MonthlySummaryView year={year} month={month} search={search} />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : isError || !data ? (
        <ErrorMessage message="Could not load staff attendance." onRetry={refetch} />
      ) : (
        <>
          <AttendanceTable
            title="Teachers"
            rows={filterStaff(data.teachers, search)}
            markingId={markingId}
            emptyText={emptyText}
            onMark={(row, status) => handleMark(row, status, true)}
          />
          <AttendanceTable
            title="Non-academic staff"
            rows={filterStaff(data.non_academic_staff, search)}
            markingId={markingId}
            emptyText={emptyText}
            onMark={(row, status) => handleMark(row, status, false)}
          />
        </>
      )}
    </div>
  );
}
