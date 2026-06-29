import { Link } from "react-router";
import { EventSchedule, Add, Calendar, CheckmarkFilled, Time, WarningFilled } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const TODAY = new Date().toLocaleDateString("en-LK", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const SESSIONS = [
  { id: "SES-001", class: "10-A", grade: "Grade 10", subject: "Mathematics", teacher: "Priya Rathnayake", time: "08:00", duration: "45 min", status: "Pending", students: 38 },
  { id: "SES-002", class: "10-B", grade: "Grade 10", subject: "English",     teacher: "Suresh Dissanayake", time: "08:55", duration: "45 min", status: "Pending", students: 35 },
  { id: "SES-003", class: "11-A", grade: "Grade 11", subject: "Science",     teacher: "Priya Rathnayake",   time: "09:50", duration: "45 min", status: "Marked",  students: 36 },
  { id: "SES-004", class: "9-A",  grade: "Grade 9",  subject: "History",     teacher: "Chamari Wickramasinghe", time: "10:45", duration: "45 min", status: "Pending", students: 42 },
  { id: "SES-005", class: "8-A",  grade: "Grade 8",  subject: "Sinhala",     teacher: "Nimal Jayasuriya",   time: "11:40", duration: "45 min", status: "Pending", students: 44 },
];

const marked  = SESSIONS.filter(s => s.status === "Marked").length;
const pending = SESSIONS.filter(s => s.status === "Pending").length;

type StatusType = "Pending" | "Marked";
const STATUS_CONFIG: Record<StatusType, { label: string; tagType: "blue" | "gray"; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = {
  Marked:  { label: "Marked",  tagType: "blue",  Icon: CheckmarkFilled },
  Pending: { label: "Pending", tagType: "gray",  Icon: Time },
};

export default function Attendance() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Attendance</h1>
          <p className="os-page__subtitle">{TODAY}</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md">
          New Session
        </Button>
      </div>

      {/* Summary strip */}
      <div className="os-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="os-stat-card">
          <p className="os-stat-card__label"><EventSchedule size={14} style={{ fill: "#406AAF" }} /> Sessions Today</p>
          <p className="os-stat-card__value">{SESSIONS.length}</p>
          <p className="os-stat-card__meta">Scheduled</p>
        </div>
        <div className="os-stat-card" style={{ borderTopColor: "#24a148" }}>
          <p className="os-stat-card__label"><CheckmarkFilled size={14} style={{ fill: "#24a148" }} /> Marked</p>
          <p className="os-stat-card__value">{marked}</p>
          <p className="os-stat-card__meta">Completed</p>
        </div>
        <div className="os-stat-card" style={{ borderTopColor: "#f1c21b" }}>
          <p className="os-stat-card__label"><WarningFilled size={14} style={{ fill: "#f1c21b" }} /> Pending</p>
          <p className="os-stat-card__value">{pending}</p>
          <p className="os-stat-card__meta">Awaiting mark</p>
        </div>
      </div>

      {/* Sessions table */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Today's Sessions</h2>
          <Button renderIcon={Calendar} kind="ghost" size="sm">View Report</Button>
        </div>
        <table className="os-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Students</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SESSIONS.map(s => {
              const cfg = STATUS_CONFIG[s.status as StatusType];
              return (
                <tr key={s.id}>
                  <td>
                    <span className="os-table__mono">{s.time}</span>
                    <span style={{ fontSize: "0.7rem", color: "#8d8d8d", marginLeft: "0.35rem" }}>{s.duration}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{s.class}</span>
                    <span className="os-table__muted" style={{ fontSize: "0.75rem", marginLeft: "0.35rem" }}>{s.grade}</span>
                  </td>
                  <td>{s.subject}</td>
                  <td className="os-table__muted">{s.teacher}</td>
                  <td className="os-table__muted">{s.students}</td>
                  <td>
                    <Tag type={cfg.tagType} size="sm">
                      <cfg.Icon size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                      {cfg.label}
                    </Tag>
                  </td>
                  <td>
                    {s.status === "Pending" ? (
                      <Button
                        kind="primary"
                        size="sm"
                        as={Link}
                        to={`/attendance/sessions/${s.id}/mark`}
                      >
                        Mark
                      </Button>
                    ) : (
                      <Button
                        kind="ghost"
                        size="sm"
                        as={Link}
                        to={`/attendance/sessions/${s.id}/mark`}
                        style={{ color: "#406AAF" }}
                      >
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Past sessions */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Previous Sessions</h2>
        </div>
        <div className="os-placeholder">
          <EventSchedule size={32} />
          <p>Past attendance sessions will appear here.</p>
        </div>
      </div>
    </div>
  );
}
