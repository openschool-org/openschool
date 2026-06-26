import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { EventSchedule, UserMultiple, CheckmarkFilled, Time, ArrowRight } from "@carbon/icons-react";

const ACCENT = "#406AAF";

const TEACHER = { name: "Priya Rathnayake", initials: "PR", subject: "Mathematics & Science", id: "T-0001" };

const MY_CLASSES = [
  { id: "CL-001", name: "10-A", grade: "Grade 10", stream: "Science", students: 38, todaySession: { subject: "Mathematics", time: "07:45", status: "Marked" } },
  { id: "CL-003", name: "11-A", grade: "Grade 11", stream: "Science", students: 36, todaySession: { subject: "Science",     time: "09:30", status: "Pending" } },
];

const RECENT = [
  { date: "Today",      time: "07:45", class: "10-A", subject: "Mathematics", present: 37, absent: 1, status: "Marked"  },
  { date: "Yesterday",  time: "09:30", class: "11-A", subject: "Science",     present: 34, absent: 2, status: "Marked"  },
  { date: "Yesterday",  time: "07:45", class: "10-A", subject: "Mathematics", present: 36, absent: 2, status: "Marked"  },
  { date: "24 Jun",     time: "09:30", class: "11-A", subject: "Science",     present: 35, absent: 1, status: "Marked"  },
];

export default function TeacherDashboard() {
  const pending = MY_CLASSES.filter(c => c.todaySession.status === "Pending");

  return (
    <div className="os-page">
      {/* Welcome banner */}
      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderTop: `3px solid ${ACCENT}`, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
          {TEACHER.initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "1.1rem", fontWeight: 500, color: "#161616" }}>Good morning, {TEACHER.name}</p>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>{TEACHER.subject} · {TEACHER.id} · 2025/2026 Term 2</p>
        </div>
        {pending.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#fff8e1", border: "1px solid #f1c21b", fontSize: "0.8125rem", color: "#6b4c00" }}>
            <Time size={14} style={{ fill: "#f1c21b" }} />
            {pending.length} session{pending.length > 1 ? "s" : ""} pending today
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          {/* Today's classes */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Today's Classes</h2>
              <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>Thursday, 26 June 2026</span>
            </div>
            <div>
              {MY_CLASSES.map((cls, i) => (
                <div key={cls.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem", borderBottom: i < MY_CLASSES.length - 1 ? "1px solid #f4f4f4" : "none", flexWrap: "wrap" }}>
                  <div style={{ width: "2.25rem", height: "2.25rem", background: "#edf2fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: "0.75rem", color: ACCENT }}>
                    {cls.name}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 0.15rem", fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
                      {cls.grade} — {cls.todaySession.subject}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                      {cls.todaySession.time} · {cls.students} students · {cls.stream}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Tag type={cls.todaySession.status === "Marked" ? "blue" : "gray"} size="sm">
                      {cls.todaySession.status}
                    </Tag>
                    {cls.todaySession.status === "Pending" ? (
                      <Link to={`/attendance/sessions/${cls.id}-today/mark`} style={{ fontSize: "0.8125rem", color: ACCENT, textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
                        Mark now →
                      </Link>
                    ) : (
                      <Link to={`/t/attendance`} style={{ fontSize: "0.8125rem", color: "#8d8d8d", textDecoration: "none", whiteSpace: "nowrap" }}>
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
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
                <tr><th>Date</th><th>Class</th><th>Subject</th><th>Present</th><th>Absent</th><th>Status</th></tr>
              </thead>
              <tbody>
                {RECENT.map((s, i) => (
                  <tr key={i}>
                    <td><span style={{ fontSize: "0.8125rem", color: "#525252" }}>{s.date}</span><br /><span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>{s.time}</span></td>
                    <td className="os-table__link">{s.class}</td>
                    <td className="os-table__muted">{s.subject}</td>
                    <td><span style={{ color: "#24a148", fontWeight: 600 }}>{s.present}</span></td>
                    <td><span style={{ color: s.absent > 0 ? "#da1e28" : "#8d8d8d", fontWeight: s.absent > 0 ? 600 : 400 }}>{s.absent}</span></td>
                    <td><Tag type="blue" size="sm">{s.status}</Tag></td>
                  </tr>
                ))}
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
              <h2 className="os-section__title">This Week</h2>
              <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>23–27 Jun</span>
            </div>
            <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
              {[
                { label: "Sessions Marked",  value: "3",   color: "#24a148" },
                { label: "Sessions Pending", value: "1",   color: "#f1c21b" },
                { label: "Total Students",   value: "74",  color: "#161616" },
                { label: "Avg Attendance",   value: "95%", color: ACCENT    },
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
              {MY_CLASSES.map((cls, i) => (
                <div key={cls.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: i < MY_CLASSES.length - 1 ? "1px solid #f4f4f4" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>{cls.grade} — {cls.name}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{cls.stream} · {cls.students} students</p>
                  </div>
                  <Link to={`/t/classes`} style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                    <CheckmarkFilled size={14} style={{ fill: "#e0e0e0" }} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
