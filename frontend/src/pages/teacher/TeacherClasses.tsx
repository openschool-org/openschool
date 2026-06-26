import { useState } from "react";
import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { Search, UserMultiple, EventSchedule } from "@carbon/icons-react";

const ACCENT = "#406AAF";

const CLASSES = [
  {
    id: "CL-001", name: "10-A", grade: "Grade 10", stream: "Science",
    subject: "Mathematics", room: "Room 12", students: 38,
    attendance: 94,
    roster: [
      { id: "S-001", name: "Sanuji Mendis",   no: "ADM-2026-0319", status: "Present" },
      { id: "S-002", name: "Kavinda Perera",  no: "ADM-2026-0290", status: "Present" },
      { id: "S-003", name: "Nimesha Gamage",  no: "ADM-2026-0271", status: "Present" },
      { id: "S-004", name: "Tharindu Silva",  no: "ADM-2026-0265", status: "Absent"  },
      { id: "S-005", name: "Dilani Fernando", no: "ADM-2026-0258", status: "Present" },
      { id: "S-006", name: "Roshan Jayasinghe", no: "ADM-2026-0240", status: "Present" },
    ],
  },
  {
    id: "CL-003", name: "11-A", grade: "Grade 11", stream: "Science",
    subject: "Science", room: "Room 14", students: 36,
    attendance: 96,
    roster: [
      { id: "S-041", name: "Kasun Gamage",    no: "ADM-2025-0318", status: "Present" },
      { id: "S-042", name: "Oshadi Weerasinghe", no: "ADM-2025-0301", status: "Present" },
      { id: "S-043", name: "Chathura Bandara",   no: "ADM-2025-0289", status: "Present" },
      { id: "S-044", name: "Malshi Rathnayake",  no: "ADM-2025-0274", status: "Late"    },
      { id: "S-045", name: "Sachini Udayanga",   no: "ADM-2025-0261", status: "Present" },
    ],
  },
];

export default function TeacherClasses() {
  const [query, setQuery] = useState("");
  const [activeClass, setActiveClass] = useState(CLASSES[0].id);

  const cls = CLASSES.find(c => c.id === activeClass) ?? CLASSES[0];
  const filtered = cls.roster.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.no.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My Classes</h1>
          <p className="os-page__subtitle">2025 / 2026 Academic Year · Term 2</p>
        </div>
      </div>

      {/* Class tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {CLASSES.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveClass(c.id); setQuery(""); }}
            style={{
              padding: "0.625rem 1.25rem", border: "1px solid", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: "inherit", transition: "all 0.15s",
              background: activeClass === c.id ? ACCENT : "#ffffff",
              borderColor: activeClass === c.id ? ACCENT : "#e0e0e0",
              color: activeClass === c.id ? "#ffffff" : "#161616",
            }}
          >
            {c.grade} — {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Student roster */}
        <div>
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Student Roster — {cls.name}</h2>
              <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{cls.students} students</span>
            </div>
            <div className="os-toolbar">
              <div className="os-search" style={{ maxWidth: "22rem" }}>
                <Search size={16} className="os-search__icon" />
                <input
                  className="os-search__input"
                  placeholder="Search students…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <Link
                to={`/attendance/sessions/${cls.id}-today/mark`}
                style={{ marginLeft: "auto", padding: "0.5625rem 1rem", background: ACCENT, color: "#fff", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <EventSchedule size={16} /> Mark Attendance
              </Link>
            </div>
            <table className="os-table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Admission No.</th><th>Today</th></tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td className="os-table__muted" style={{ width: "2rem" }}>{i + 1}</td>
                    <td>
                      <Link to={`/students/${s.id}`} className="os-table__link">{s.name}</Link>
                    </td>
                    <td className="os-table__mono">{s.no}</td>
                    <td>
                      <Tag
                        type={s.status === "Present" ? "blue" : s.status === "Absent" ? "red" : "warm-gray"}
                        size="sm"
                      >
                        {s.status}
                      </Tag>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "#8d8d8d", padding: "2rem" }}>No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Class info */}
        <div>
          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Class Details</h2></div>
            <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
              {[
                ["Grade",     cls.grade],
                ["Class",     cls.name],
                ["Stream",    cls.stream],
                ["Subject",   cls.subject],
                ["Room",      cls.room],
                ["Students",  cls.students],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#525252" }}>{label}</span>
                  <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Monthly Attendance</h2></div>
            <div className="os-section__body" style={{ padding: "1rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
                <span style={{ color: "#525252" }}>Rate</span>
                <span style={{ fontWeight: 600, color: "#161616" }}>{cls.attendance}%</span>
              </div>
              <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "3px" }}>
                <div style={{ width: `${cls.attendance}%`, height: "100%", background: cls.attendance >= 90 ? "#24a148" : ACCENT, borderRadius: "3px" }} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem" }}>
                <UserMultiple size={14} style={{ fill: ACCENT }} />
                <span style={{ fontSize: "0.75rem", color: "#525252" }}>{cls.students} enrolled students</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
