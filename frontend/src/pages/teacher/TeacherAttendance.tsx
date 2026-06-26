import { useState } from "react";
import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { EventSchedule, Search, CheckmarkFilled, Time } from "@carbon/icons-react";

const ACCENT = "#406AAF";

type SessionStatus = "Marked" | "Pending";

const SESSIONS: {
  id: string; date: string; time: string; class: string; classId: string;
  subject: string; students: number; present: number; absent: number; late: number; status: SessionStatus;
}[] = [
  { id: "S-2026-0060", date: "2026-06-26", time: "07:45", class: "10-A", classId: "CL-001", subject: "Mathematics", students: 38, present: 37, absent: 1, late: 0, status: "Marked"  },
  { id: "S-2026-0061", date: "2026-06-26", time: "09:30", class: "11-A", classId: "CL-003", subject: "Science",     students: 36, present: 0,  absent: 0, late: 0, status: "Pending" },
  { id: "S-2026-0057", date: "2026-06-25", time: "07:45", class: "10-A", classId: "CL-001", subject: "Mathematics", students: 38, present: 36, absent: 2, late: 0, status: "Marked"  },
  { id: "S-2026-0058", date: "2026-06-25", time: "09:30", class: "11-A", classId: "CL-003", subject: "Science",     students: 36, present: 34, absent: 2, late: 0, status: "Marked"  },
  { id: "S-2026-0054", date: "2026-06-24", time: "07:45", class: "10-A", classId: "CL-001", subject: "Mathematics", students: 38, present: 38, absent: 0, late: 0, status: "Marked"  },
  { id: "S-2026-0055", date: "2026-06-24", time: "09:30", class: "11-A", classId: "CL-003", subject: "Science",     students: 36, present: 35, absent: 1, late: 0, status: "Marked"  },
  { id: "S-2026-0051", date: "2026-06-23", time: "07:45", class: "10-A", classId: "CL-001", subject: "Mathematics", students: 38, present: 35, absent: 2, late: 1, status: "Marked"  },
  { id: "S-2026-0052", date: "2026-06-23", time: "09:30", class: "11-A", classId: "CL-003", subject: "Science",     students: 36, present: 33, absent: 3, late: 0, status: "Marked"  },
];

const FILTERS = ["All", "Pending", "Marked"] as const;

export default function TeacherAttendance() {
  const [filter, setFilter] = useState<"All" | SessionStatus>("All");
  const [query, setQuery] = useState("");

  const pending = SESSIONS.filter(s => s.status === "Pending");
  const marked  = SESSIONS.filter(s => s.status === "Marked");

  const visible = SESSIONS.filter(s => {
    const matchFilter = filter === "All" || s.status === filter;
    const matchQuery  = s.class.toLowerCase().includes(query.toLowerCase()) ||
      s.subject.toLowerCase().includes(query.toLowerCase()) ||
      s.id.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Attendance</h1>
          <p className="os-page__subtitle">Your sessions for 2025/2026 · Term 2</p>
        </div>
      </div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <div style={{ background: "#fff8e1", border: "1px solid #f1c21b", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Time size={18} style={{ fill: "#f1c21b", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.875rem", color: "#6b4c00" }}>
              {pending.length} session{pending.length > 1 ? "s" : ""} pending today
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d6300" }}>Mark attendance before the session locks at end of day.</p>
          </div>
          {pending.map(s => (
            <Link
              key={s.id}
              to={`/attendance/sessions/${s.id}/mark`}
              style={{ padding: "0.5rem 1rem", background: ACCENT, color: "#fff", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <EventSchedule size={14} /> {s.class} — {s.subject}
            </Link>
          ))}
        </div>
      )}

      {/* Summary stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Sessions",  value: SESSIONS.length,   color: "#161616" },
          { label: "Marked",          value: marked.length,     color: "#24a148" },
          { label: "Pending",         value: pending.length,    color: pending.length > 0 ? "#da1e28" : "#8d8d8d" },
          { label: "Avg Attendance",  value: "94%",             color: ACCENT    },
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
            <input className="os-search__input" placeholder="Search sessions…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: "0.4rem 0.875rem", border: "1px solid", cursor: "pointer", fontSize: "0.8125rem", fontFamily: "inherit", transition: "all 0.15s",
                  background: filter === f ? ACCENT : "#ffffff",
                  borderColor: filter === f ? ACCENT : "#e0e0e0",
                  color: filter === f ? "#ffffff" : "#161616",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="os-table">
          <thead>
            <tr><th>Session</th><th>Date</th><th>Class</th><th>Subject</th><th>Present</th><th>Absent</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map(s => (
              <tr key={s.id}>
                <td className="os-table__mono" style={{ fontSize: "0.75rem" }}>{s.id}</td>
                <td><span style={{ fontSize: "0.8125rem" }}>{s.date}</span><br /><span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>{s.time}</span></td>
                <td style={{ fontWeight: 600 }}>{s.class}</td>
                <td className="os-table__muted">{s.subject}</td>
                <td>
                  {s.status === "Marked"
                    ? <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckmarkFilled size={14} style={{ fill: "#24a148" }} /><span style={{ color: "#24a148", fontWeight: 600 }}>{s.present}</span></span>
                    : <span style={{ color: "#8d8d8d" }}>—</span>}
                </td>
                <td>
                  {s.status === "Marked"
                    ? <span style={{ color: s.absent > 0 ? "#da1e28" : "#8d8d8d", fontWeight: s.absent > 0 ? 600 : 400 }}>{s.absent}</span>
                    : <span style={{ color: "#8d8d8d" }}>—</span>}
                </td>
                <td><Tag type={s.status === "Marked" ? "blue" : "gray"} size="sm">{s.status}</Tag></td>
                <td>
                  {s.status === "Pending"
                    ? <Link to={`/attendance/sessions/${s.id}/mark`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500 }}>Mark →</Link>
                    : <Link to={`/attendance/sessions/${s.id}/mark`} style={{ color: "#8d8d8d", textDecoration: "none", fontSize: "0.8125rem" }}>View</Link>}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#8d8d8d", padding: "2.5rem" }}>No sessions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
