import { useState } from "react";
import { DatePicker, DatePickerInput, Tag, Toggle } from "@carbon/react";
import { CheckmarkFilled, CloseFilled, Time, Renew } from "@carbon/icons-react";
import {
  useStaffAttendanceByDate,
  useStaffAttendanceMonthlySummary,
  useMarkStaffAttendance,
} from "../../../queries/useStaffAttendance";
import type { StaffAttendanceRow, StaffAttendanceStatus } from "../../../services/staffAttendance";
import { todayISODate } from "../../../lib/date";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";

const STATUS_STYLES: Record<StaffAttendanceStatus, { bg: string; border: string; color: string; label: string }> = {
  present: { bg: "#defbe6", border: "#24a148", color: "#0e6027", label: "Present" },
  absent: { bg: "#fff1f1", border: "#da1e28", color: "#a2191f", label: "Absent" },
  late: { bg: "#fdf6dd", border: "#f1c21b", color: "#7d5a00", label: "Late" },
  leave: { bg: "#f6f2ff", border: "#8a3ffc", color: "#6929c4", label: "Leave" },
};

function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: StaffAttendanceStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_STYLES[value];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.3rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: selected ? 600 : 400,
        fontFamily: "inherit",
        cursor: "pointer",
        border: `1px solid ${selected ? cfg.border : "#e0e0e0"}`,
        borderRadius: "2px",
        background: selected ? cfg.bg : "#ffffff",
        color: selected ? cfg.color : "#525252",
        whiteSpace: "nowrap",
      }}
    >
      {value === "present" && <CheckmarkFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {value === "absent" && <CloseFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {value === "late" && <Time size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {value === "leave" && <Renew size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {cfg.label}
    </button>
  );
}

function AttendanceTable({
  title,
  rows,
  onMark,
  markingId,
}: {
  title: string;
  rows: StaffAttendanceRow[];
  onMark: (row: StaffAttendanceRow, status: StaffAttendanceStatus) => void;
  markingId: string | null;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{title}</h2>
        <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{rows.length} staff</span>
      </div>
      <table className="os-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee No.</th>
            <th>Attendance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.staff_id}>
              <td style={{ fontWeight: 500 }}>{row.full_name}</td>
              <td className="os-table__mono">{row.employee_number}</td>
              <td>
                <div style={{ display: "flex", gap: "0.375rem", opacity: markingId === row.staff_id ? 0.5 : 1 }}>
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
          <p>No active staff.</p>
        </div>
      )}
    </div>
  );
}

function MonthlySummaryView({ year, month }: { year: number; month: number }) {
  const { data, isLoading, isError, refetch } = useStaffAttendanceMonthlySummary(year, month);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorMessage message="Could not load monthly summary." onRetry={refetch} />;

  const renderTable = (title: string, rows: typeof data.teachers) => (
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
              <td style={{ fontWeight: 500 }}>{r.full_name}</td>
              <td>{r.present_count}</td>
              <td>{r.late_count}</td>
              <td>{r.absent_count}</td>
              <td>{r.leave_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {renderTable("Teachers", data.teachers)}
      {renderTable("Non-Academic Staff", data.non_academic_staff)}
    </>
  );
}

export default function StaffAttendance() {
  const [date, setDate] = useState(todayISODate());
  const [showMonthly, setShowMonthly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useStaffAttendanceByDate(date);
  const markAttendance = useMarkStaffAttendance(date);

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
          <h1 className="os-page__title">Staff Attendance</h1>
          <p className="os-page__subtitle">
            Mark daily attendance for teachers and non-academic staff, or view monthly summaries.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {!showMonthly && (
          <DatePicker datePickerType="single" dateFormat="Y-m-d" value={date} onChange={(dates) => {
            const d = dates[0];
            if (d) {
              setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
            }
          }}>
            <DatePickerInput id="staff-attendance-date" labelText="Date" placeholder="YYYY-MM-DD" />
          </DatePicker>
        )}
        <Toggle
          id="staff-attendance-view-toggle"
          labelText="View"
          labelA="Daily"
          labelB="Monthly summary"
          toggled={showMonthly}
          onToggle={(checked) => setShowMonthly(checked)}
        />
        {!showMonthly && <Tag type="gray">{new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Tag>}
      </div>

      {showMonthly ? (
        <MonthlySummaryView year={year} month={month} />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : isError || !data ? (
        <ErrorMessage message="Could not load staff attendance." onRetry={refetch} />
      ) : (
        <>
          <AttendanceTable
            title="Teachers"
            rows={data.teachers}
            markingId={markingId}
            onMark={(row, status) => handleMark(row, status, true)}
          />
          <AttendanceTable
            title="Non-Academic Staff"
            rows={data.non_academic_staff}
            markingId={markingId}
            onMark={(row, status) => handleMark(row, status, false)}
          />
        </>
      )}
    </div>
  );
}
