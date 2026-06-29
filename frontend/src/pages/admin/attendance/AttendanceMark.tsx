import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Button, Tag } from "@carbon/react";
import {
  ArrowLeft, Save, CheckmarkFilled, CloseFilled, Time,
  Search, UserMultiple, Warning,
} from "@carbon/icons-react";

const SESSIONS: Record<string, {
  class: string; grade: string; subject: string;
  teacher: string; time: string; date: string; room: string;
}> = {
  "SES-001": { class: "10-A", grade: "Grade 10", subject: "Mathematics", teacher: "Priya Rathnayake",       time: "08:00", date: "2026-06-26", room: "Room 204" },
  "SES-002": { class: "10-B", grade: "Grade 10", subject: "English",     teacher: "Suresh Dissanayake",     time: "08:55", date: "2026-06-26", room: "Room 108" },
  "SES-003": { class: "11-A", grade: "Grade 11", subject: "Science",     teacher: "Priya Rathnayake",       time: "09:50", date: "2026-06-26", room: "Lab 01"   },
  "SES-004": { class: "9-A",  grade: "Grade 9",  subject: "History",     teacher: "Chamari Wickramasinghe", time: "10:45", date: "2026-06-26", room: "Room 312" },
  "SES-005": { class: "8-A",  grade: "Grade 8",  subject: "Sinhala",     teacher: "Nimal Jayasuriya",       time: "11:40", date: "2026-06-26", room: "Room 216" },
};

const STUDENTS = [
  { id: "S-0001", name: "Kavinda Perera",      admNo: "ADM-2020-0145" },
  { id: "S-0002", name: "Nimasha Silva",        admNo: "ADM-2020-0162" },
  { id: "S-0003", name: "Dulith Fernando",      admNo: "ADM-2021-0031" },
  { id: "S-0004", name: "Thilini Jayawardena",  admNo: "ADM-2020-0178" },
  { id: "S-0005", name: "Ashan Bandara",        admNo: "ADM-2021-0055" },
  { id: "S-0006", name: "Sachini Rajapaksa",    admNo: "ADM-2020-0193" },
  { id: "S-0007", name: "Ravindu Madushanka",   admNo: "ADM-2021-0067" },
  { id: "S-0008", name: "Dilini Kumari",        admNo: "ADM-2020-0211" },
  { id: "S-0009", name: "Pasindu Herath",       admNo: "ADM-2021-0082" },
  { id: "S-0010", name: "Senali Wickrama",      admNo: "ADM-2020-0228" },
  { id: "S-0011", name: "Lahiru Dissanayake",   admNo: "ADM-2021-0094" },
  { id: "S-0012", name: "Hasini Peris",         admNo: "ADM-2020-0247" },
  { id: "S-0013", name: "Chathura Gunasekara",  admNo: "ADM-2021-0103" },
  { id: "S-0014", name: "Imesha Rathnayake",    admNo: "ADM-2020-0265" },
  { id: "S-0015", name: "Sanuji Mendis",        admNo: "ADM-2021-0119" },
  { id: "S-0016", name: "Kasun Gamage",         admNo: "ADM-2020-0281" },
  { id: "S-0017", name: "Tharuka Senanayake",   admNo: "ADM-2021-0134" },
  { id: "S-0018", name: "Piyumi Karunathilaka", admNo: "ADM-2020-0302" },
];

type AttendanceStatus = "present" | "absent" | "late" | null;

const STATUS_STYLES: Record<NonNullable<AttendanceStatus>, { bg: string; border: string; color: string; label: string }> = {
  present: { bg: "#defbe6", border: "#24a148", color: "#0e6027", label: "Present" },
  absent:  { bg: "#fff1f1", border: "#da1e28", color: "#a2191f", label: "Absent"  },
  late:    { bg: "#fdf6dd", border: "#f1c21b", color: "#7d5a00", label: "Late"    },
};

function StatusButton({
  value, selected, onClick,
}: { value: AttendanceStatus & string; selected: boolean; onClick: () => void }) {
  const cfg = STATUS_STYLES[value as NonNullable<AttendanceStatus>];
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
        transition: "all 0.1s",
        whiteSpace: "nowrap",
      }}
    >
      {value === "present" && <CheckmarkFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {value === "absent"  && <CloseFilled     size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {value === "late"    && <Time            size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />}
      {cfg.label}
    </button>
  );
}

export default function AttendanceMark() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = SESSIONS[id ?? ""] ?? SESSIONS["SES-001"];

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  const mark = (studentId: string, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }));
    setSaved(false);
  };

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    STUDENTS.forEach(s => { next[s.id] = status; });
    setStatuses(next);
    setSaved(false);
  };

  const filtered = useMemo(() =>
    STUDENTS.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admNo.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const summary = useMemo(() => ({
    present:  Object.values(statuses).filter(v => v === "present").length,
    absent:   Object.values(statuses).filter(v => v === "absent").length,
    late:     Object.values(statuses).filter(v => v === "late").length,
    unmarked: STUDENTS.length - Object.values(statuses).filter(Boolean).length,
  }), [statuses]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => navigate("/attendance"), 1200);
  };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>

      {/* Session banner */}
      <div style={{ background: "#2d4d62", padding: "1.25rem 2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "#ffffff" }}>
              {session.subject} — {session.class}
            </span>
            <Tag type="blue" size="sm">{session.grade}</Tag>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              ["Teacher", session.teacher],
              ["Time",    session.time],
              ["Date",    session.date],
              ["Room",    session.room],
            ].map(([label, val]) => (
              <span key={label} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", marginRight: "0.3rem" }}>{label}:</span>{val}
              </span>
            ))}
          </div>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="sm" as={Link} to="/attendance" style={{ color: "#ffffff" }}>
          Back
        </Button>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>

        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Present",  count: summary.present,  color: "#24a148" },
            { label: "Absent",   count: summary.absent,   color: "#da1e28" },
            { label: "Late",     count: summary.late,     color: "#7d5a00" },
            { label: "Unmarked", count: summary.unmarked, color: "#525252" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderTop: `3px solid ${color}`, padding: "0.875rem 1rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#525252" }}>{label}</p>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 300, color: "#161616" }}>{count}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="os-section">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
            <div className="os-search" style={{ maxWidth: "280px" }}>
              <Search size={16} className="os-search__icon" />
              <input
                className="os-search__input"
                placeholder="Search student…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "0.75rem", color: "#525252", whiteSpace: "nowrap" }}>Mark all:</span>
            <button onClick={() => markAll("present")} style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "1px solid #24a148", background: "#defbe6", color: "#0e6027", fontFamily: "inherit", borderRadius: "2px" }}>
              ✓ Present
            </button>
            <button onClick={() => markAll("absent")} style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "1px solid #da1e28", background: "#fff1f1", color: "#a2191f", fontFamily: "inherit", borderRadius: "2px" }}>
              ✕ Absent
            </button>
            <button onClick={() => setStatuses({})} style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", cursor: "pointer", border: "1px solid #e0e0e0", background: "#ffffff", color: "#525252", fontFamily: "inherit", borderRadius: "2px" }}>
              Clear
            </button>
          </div>

          {/* Student list */}
          <table className="os-table">
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Student</th>
                <th>Adm. No.</th>
                <th>Attendance</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, idx) => {
                const status = statuses[student.id] ?? null;
                return (
                  <tr key={student.id} style={{ background: status ? STATUS_STYLES[status].bg + "66" : "transparent" }}>
                    <td style={{ color: "#8d8d8d", fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem" }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div style={{
                          width: "1.75rem", height: "1.75rem", borderRadius: "50%",
                          background: status ? STATUS_STYLES[status].bg : "#eef4f8",
                          border: `1px solid ${status ? STATUS_STYLES[status].border : "#b3cedc"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.6rem", fontWeight: 700,
                          color: status ? STATUS_STYLES[status].color : "#406AAF",
                          flexShrink: 0,
                        }}>
                          {student.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{student.name}</span>
                      </div>
                    </td>
                    <td className="os-table__mono">{student.admNo}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        {(["present", "absent", "late"] as NonNullable<AttendanceStatus>[]).map(s => (
                          <StatusButton key={s} value={s} selected={status === s} onClick={() => mark(student.id, s)} />
                        ))}
                      </div>
                    </td>
                    <td>
                      {status === "absent" || status === "late" ? (
                        <input
                          placeholder="Optional note…"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: "inherit", border: "1px solid #e0e0e0", outline: "none", width: "140px" }}
                        />
                      ) : (
                        <span style={{ color: "#c6c6c6", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="os-placeholder">
              <UserMultiple size={32} />
              <p>No students match "{search}"</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 0", flexWrap: "wrap" }}>
          {summary.unmarked > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#7d5a00" }}>
              <Warning size={16} style={{ fill: "#f1c21b" }} />
              {summary.unmarked} student{summary.unmarked !== 1 ? "s" : ""} not yet marked
            </div>
          )}
          <div style={{ flex: 1 }} />
          {saved && (
            <span style={{ fontSize: "0.8125rem", color: "#24a148", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <CheckmarkFilled size={16} style={{ fill: "#24a148" }} /> Saved — redirecting…
            </span>
          )}
          <Button kind="secondary" size="md" as={Link} to="/attendance">Cancel</Button>
          <Button renderIcon={Save} kind="primary" size="md" onClick={handleSave} disabled={saved}>
            Save Attendance
          </Button>
        </div>

      </div>
    </div>
  );
}
