import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { useQueries } from "@tanstack/react-query";
import { EventSchedule, UserMultiple, CheckmarkFilled, Time, ArrowRight } from "@carbon/icons-react";
import { useMyClasses } from "../../queries/useTeachers";
import { useDailySessions, useSessionRecords, classSessionsKey } from "../../queries/useAttendance";
import { classStudentsKey } from "../../queries/useClasses";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import { attendanceApi, type AttendanceSession } from "../../services/attendance";
import { studentApi } from "../../services/student";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";

const ACCENT = "#406AAF";

function todayISODate(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function RecentSessionRow({ session, className }: { session: AttendanceSession; className: string }) {
  const { data: records, isLoading } = useSessionRecords(session.id);
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const absent = records?.filter((r) => r.status === "absent").length ?? 0;

  return (
    <tr>
      <td><span style={{ fontSize: "0.8125rem", color: "#525252" }}>{session.date}</span></td>
      <td className="os-table__link">{className}</td>
      <td>
        {isLoading ? <span style={{ color: "#8d8d8d" }}>…</span> : <span style={{ color: "#24a148", fontWeight: 600 }}>{present}</span>}
      </td>
      <td>
        {isLoading ? (
          <span style={{ color: "#8d8d8d" }}>…</span>
        ) : (
          <span style={{ color: absent > 0 ? "#da1e28" : "#8d8d8d", fontWeight: absent > 0 ? 600 : 400 }}>{absent}</span>
        )}
      </td>
      <td><Tag type="blue" size="sm">Marked</Tag></td>
    </tr>
  );
}

export default function TeacherDashboard() {
  const { teacher: profile, classes: myClasses, isLoading: profileLoading, isError: profileError, refetch } = useMyClasses();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: dailySessions } = useDailySessions(todayISODate());

  const classIds = myClasses.map((c) => c.class_id);

  const studentQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classStudentsKey(id),
      queryFn: () => studentApi.listByClass(id),
      enabled: !!id,
    })),
  });
  const sessionQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classSessionsKey(id),
      queryFn: () => attendanceApi.listSessionsByClass(id),
      enabled: !!id,
    })),
  });

  const studentCountByClass = new Map(classIds.map((id, i) => [id, studentQueries[i]?.data?.length ?? 0]));
  const totalStudents = [...studentCountByClass.values()].reduce((sum, n) => sum + n, 0);

  const todaySessionByClass = new Map(
    (dailySessions ?? []).filter((s) => classIds.includes(s.class_id)).map((s) => [s.class_id, s])
  );
  const markedCount = todaySessionByClass.size;
  const pendingCount = Math.max(myClasses.length - markedCount, 0);

  const recentSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls?.class_name ?? "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
    .slice(0, 6);

  const currentTerm = terms?.find((t) => t.is_current);

  if (profileLoading) return <LoadingSpinner />;
  if (profileError || !profile) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your teacher profile" onRetry={refetch} />
      </div>
    );
  }

  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const subjectSummary = [...new Set(myClasses.flatMap((c) => c.subjects))].join(", ") || "No subjects assigned yet";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="os-page">
      {/* Welcome banner */}
      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderTop: `3px solid ${ACCENT}`, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "1.1rem", fontWeight: 500, color: "#161616" }}>
            {greeting}, {profile.title ? `${profile.title} ` : ""}{profile.full_name}
          </p>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
            {subjectSummary} · {profile.employee_number}
            {currentYear?.label ? ` · ${currentYear.label}` : ""}
            {currentTerm ? ` ${currentTerm.name}` : ""}
          </p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#fff8e1", border: "1px solid #f1c21b", fontSize: "0.8125rem", color: "#6b4c00" }}>
            <Time size={14} style={{ fill: "#f1c21b" }} />
            {pendingCount} session{pendingCount > 1 ? "s" : ""} pending today
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          {/* Today's classes */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Today's Classes</h2>
              <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div>
              {profileLoading ? (
                <LoadingSpinner />
              ) : myClasses.length === 0 ? (
                <p style={{ padding: "1.5rem", color: "#8d8d8d", fontSize: "0.8125rem" }}>No classes assigned yet.</p>
              ) : (
                myClasses.map((cls, i) => {
                  const session = todaySessionByClass.get(cls.class_id);
                  return (
                    <div key={cls.class_id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem", borderBottom: i < myClasses.length - 1 ? "1px solid #f4f4f4" : "none", flexWrap: "wrap" }}>
                      <div style={{ width: "2.25rem", height: "2.25rem", background: "#edf2fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: "0.75rem", color: ACCENT }}>
                        {cls.class_name}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 0.15rem", fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
                          {cls.grade_name} — {cls.class_name}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                          {cls.subjects.join(", ")} · {studentCountByClass.get(cls.class_id) ?? 0} students
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Tag type={session ? "blue" : "gray"} size="sm">
                          {session ? "Marked" : "Pending"}
                        </Tag>
                        {session ? (
                          <Link to={`/attendance/sessions/${session.id}/mark`} style={{ fontSize: "0.8125rem", color: "#8d8d8d", textDecoration: "none", whiteSpace: "nowrap" }}>
                            View →
                          </Link>
                        ) : (
                          <Link to="/t/attendance" style={{ fontSize: "0.8125rem", color: ACCENT, textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
                            Mark now →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Recent Sessions</h2>
              <Link to="/t/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View all →</Link>
            </div>
            <table className="os-table">
              <thead>
                <tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#8d8d8d", padding: "2rem" }}>No attendance sessions recorded yet</td></tr>
                ) : (
                  recentSessions.map(({ session, className }) => (
                    <RecentSessionRow key={session.id} session={session} className={className} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right */}
        <div>
          {/* Quick actions */}
          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Quick Actions</h2></div>
            <div style={{ padding: "0.75rem" }}>
              {[
                { label: "Mark Attendance", desc: "Record today's session", path: "/t/attendance", Icon: EventSchedule },
                { label: "My Classes",      desc: "View class rosters",      path: "/t/classes",    Icon: UserMultiple  },
              ].map(({ label, desc, path, Icon }) => (
                <Link key={label} to={path} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem", border: "1px solid #e0e0e0", marginBottom: "0.5rem", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  >
                    <Icon size={20} style={{ fill: ACCENT, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{desc}</p>
                    </div>
                    <ArrowRight size={14} style={{ fill: "#8d8d8d" }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* This week summary */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Today</h2>
            </div>
            <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
              {[
                { label: "Sessions Marked",  value: String(markedCount),  color: "#24a148" },
                { label: "Sessions Pending", value: String(pendingCount), color: pendingCount > 0 ? "#f1c21b" : "#8d8d8d" },
                { label: "My Classes",       value: String(myClasses.length), color: "#161616" },
                { label: "Total Students",   value: String(totalStudents), color: ACCENT },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#525252" }}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My classes quick view */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">My Classes</h2>
              <Link to="/t/classes" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View →</Link>
            </div>
            <div>
              {myClasses.length === 0 ? (
                <p style={{ padding: "1.5rem", color: "#8d8d8d", fontSize: "0.8125rem" }}>No classes assigned yet.</p>
              ) : (
                myClasses.map((cls, i) => (
                  <div key={cls.class_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: i < myClasses.length - 1 ? "1px solid #f4f4f4" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>{cls.grade_name} — {cls.class_name}</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{cls.subjects.join(", ")} · {studentCountByClass.get(cls.class_id) ?? 0} students</p>
                    </div>
                    <Link to="/t/classes" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                      <CheckmarkFilled size={14} style={{ fill: todaySessionByClass.has(cls.class_id) ? "#24a148" : "#e0e0e0" }} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
