import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Tag } from "@carbon/react";
import { useQueries } from "@tanstack/react-query";
import { EventSchedule, Search, CheckmarkFilled, Time } from "@carbon/icons-react";
import { useMyClasses } from "../../queries/useTeachers";
import { useDailySessions, useSessionRecords, useCreateSession, classSessionsKey } from "../../queries/useAttendance";
import { attendanceApi, type AttendanceSession } from "../../services/attendance";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";
import { todayISODate } from "../../lib/date";

const ACCENT = "#406AAF";

function PendingClassAction({ classId, className, gradeName }: { classId: string; className: string; gradeName: string }) {
  const navigate = useNavigate();
  const createSession = useCreateSession(classId);

  const handleClick = () => {
    createSession.mutate(
      { class_id: classId, date: todayISODate() },
      { onSuccess: (session) => navigate(`/attendance/sessions/${session.id}/mark`) }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={createSession.isPending}
      style={{ padding: "0.5rem 1rem", background: ACCENT, color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "inherit" }}
    >
      <EventSchedule size={14} /> {createSession.isPending ? "Starting…" : `${gradeName} — ${className}`}
    </button>
  );
}

function SessionRow({ session, className }: { session: AttendanceSession; className: string }) {
  const { data: records, isLoading } = useSessionRecords(session.id);
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const absent = records?.filter((r) => r.status === "absent").length ?? 0;

  return (
    <tr>
      <td className="os-table__mono" style={{ fontSize: "0.75rem" }}>{session.date}</td>
      <td style={{ fontWeight: 600 }}>{className}</td>
      <td>
        {isLoading ? (
          <span style={{ color: "#8d8d8d" }}>—</span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <CheckmarkFilled size={14} style={{ fill: "#24a148" }} />
            <span style={{ color: "#24a148", fontWeight: 600 }}>{present}</span>
          </span>
        )}
      </td>
      <td>
        {isLoading ? (
          <span style={{ color: "#8d8d8d" }}>—</span>
        ) : (
          <span style={{ color: absent > 0 ? "#da1e28" : "#8d8d8d", fontWeight: absent > 0 ? 600 : 400 }}>{absent}</span>
        )}
      </td>
      <td><Tag type="blue" size="sm">Marked</Tag></td>
      <td>
        <Link to={`/attendance/sessions/${session.id}/mark`} style={{ color: "#8d8d8d", textDecoration: "none", fontSize: "0.8125rem" }}>
          View
        </Link>
      </td>
    </tr>
  );
}

export default function TeacherAttendance() {
  const { classes: myClasses, isLoading, isError, refetch } = useMyClasses();
  const [query, setQuery] = useState("");

  const classIds = myClasses.map((c) => c.class_id);
  const sessionQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classSessionsKey(id),
      queryFn: () => attendanceApi.listSessionsByClass(id),
      enabled: !!id,
    })),
  });
  const { data: dailySessions } = useDailySessions(todayISODate());
  const todayClassIds = new Set((dailySessions ?? []).map((s) => s.class_id));
  const pendingToday = myClasses.filter((c) => !todayClassIds.has(c.class_id));

  const allSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls?.class_name ?? "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date));

  const visible = allSessions.filter(
    ({ className, session }) =>
      className.toLowerCase().includes(query.toLowerCase()) || session.date.includes(query)
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your classes" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Attendance</h1>
          <p className="os-page__subtitle">Every session you've recorded, across your classes</p>
        </div>
      </div>

      {pendingToday.length > 0 && (
        <div style={{ background: "#fff8e1", border: "1px solid #f1c21b", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Time size={18} style={{ fill: "#f1c21b", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.875rem", color: "#6b4c00" }}>
              {pendingToday.length} class{pendingToday.length > 1 ? "es" : ""} not marked today
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d6300" }}>Start today's session for a class.</p>
          </div>
          {pendingToday.map((c) => (
            <PendingClassAction key={c.class_id} classId={c.class_id} className={c.class_name} gradeName={c.grade_name} />
          ))}
        </div>
      )}

      {/* Summary stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Sessions", value: allSessions.length, color: "#161616" },
          { label: "Marked Today", value: todayClassIds.size, color: "#24a148" },
          { label: "Pending Today", value: pendingToday.length, color: pendingToday.length > 0 ? "#da1e28" : "#8d8d8d" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderTop: `3px solid ${color === "#161616" ? ACCENT : color}`, padding: "1rem 1.25rem" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#525252" }}>{label}</p>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 300, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Session list */}
      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search" style={{ maxWidth: "22rem" }}>
            <Search size={16} className="os-search__icon" />
            <input className="os-search__input" placeholder="Search by class or date…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>

        <table className="os-table">
          <thead>
            <tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#8d8d8d", padding: "2.5rem" }}>No sessions found</td></tr>
            ) : (
              visible.map(({ session, className }) => (
                <SessionRow key={session.id} session={session} className={className} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
