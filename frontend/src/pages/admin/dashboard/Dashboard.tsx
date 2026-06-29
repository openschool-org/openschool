import {
  UserMultiple,
  Education,
  Building,
  Book,
  CheckmarkFilled,
  UserFollow,
  Time,
} from "@carbon/icons-react";
import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { useSchool } from "../../../queries/useSchool";

const ACCENT = "#406AAF";

const STATS = [
  { label: "Total Students", value: "342", Icon: UserMultiple, path: "/students" },
  { label: "Teachers",       value: "18",  Icon: Education,    path: "/teachers" },
  { label: "Classes",        value: "6",   Icon: Building,     path: "/classes"  },
  { label: "Subjects",       value: "11",  Icon: Book,         path: "/subjects" },
];


const ACTIVITY = [
  {
    type: "attendance",
    text: "Attendance marked for Grade 11-A — Science",
    sub: "Priya Rathnayake · 36 present, 2 absent",
    time: "09:52 AM",
    tag: { label: "Marked", color: "blue" },
  },
  {
    type: "enrol",
    text: "New student enrolled — Sanuji Mendis",
    sub: "Grade 10-A · ADM-2026-0319",
    time: "09:14 AM",
    tag: { label: "Enrolment", color: "blue" },
  },
  {
    type: "attendance",
    text: "Attendance marked for Grade 10-A — Mathematics",
    sub: "Priya Rathnayake · 37 present, 1 absent",
    time: "08:48 AM",
    tag: { label: "Marked", color: "blue" },
  },
  {
    type: "pending",
    text: "Grade 10-B session pending — English",
    sub: "Suresh Dissanayake · 08:55 session",
    time: "08:55 AM",
    tag: { label: "Pending", color: "gray" },
  },
  {
    type: "enrol",
    text: "New student enrolled — Kasun Gamage",
    sub: "Grade 8-A · ADM-2026-0318",
    time: "Yesterday",
    tag: { label: "Enrolment", color: "blue" },
  },
  {
    type: "attendance",
    text: "Attendance marked for Grade 9-A — History",
    sub: "Chamari Wickramasinghe · 40 present, 2 absent",
    time: "Yesterday",
    tag: { label: "Marked", color: "blue" },
  },
];

const ICON_MAP = {
  attendance: <CheckmarkFilled size={16} style={{ fill: "#24a148" }} />,
  enrol: <UserFollow size={16} style={{ fill: ACCENT }} />,
  pending: <Time size={16} style={{ fill: "#8d8d8d" }} />,
};

const TOP_CLASSES = [
  {
    name: "11-A",
    grade: "Grade 11",
    stream: "Science",
    students: 38,
    rate: 96,
  },
  {
    name: "10-A",
    grade: "Grade 10",
    stream: "Science",
    students: 38,
    rate: 94,
  },
  { name: "10-B", grade: "Grade 10", stream: "Arts", students: 35, rate: 91 },
  { name: "9-A", grade: "Grade 9", stream: "General", students: 42, rate: 88 },
];

export default function Dashboard() {
  const { data: school } = useSchool();
  const title = school?.name
    ? `${school.name} - Admin Dashboard`
    : "Admin Dashboard";

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{title}</h1>
        </div>
      </div>

      {/* Stat cards */}
      <div className="os-stat-grid">
        {STATS.map(({ label, value, Icon, path }) => (
          <Link key={label} to={path} style={{ textDecoration: "none" }}>
            <div className="os-stat-card" style={{ cursor: "pointer" }}>
              <p className="os-stat-card__label">
                <Icon size={14} style={{ fill: ACCENT }} />
                {label}
              </p>
              <p className="os-stat-card__value">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div>

          {/* Recent Activity */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Recent Activity</h2>
              <Link
                to="/attendance"
                style={{
                  fontSize: "0.75rem",
                  color: ACCENT,
                  textDecoration: "none",
                }}
              >
                View all →
              </Link>
            </div>
            <div>
              {ACTIVITY.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                    padding: "0.875rem 1.5rem",
                    borderBottom:
                      i < ACTIVITY.length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    {ICON_MAP[item.type as keyof typeof ICON_MAP]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 0.15rem",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#161616",
                      }}
                    >
                      {item.text}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "#525252",
                      }}
                    >
                      {item.sub}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.25rem",
                      flexShrink: 0,
                    }}
                  >
                    <Tag type={item.tag.color as "blue" | "gray"} size="sm">
                      {item.tag.label}
                    </Tag>
                    <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Today's Attendance */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Today's Attendance</h2>
              <Link
                to="/attendance"
                style={{
                  fontSize: "0.75rem",
                  color: ACCENT,
                  textDecoration: "none",
                }}
              >
                Manage →
              </Link>
            </div>
            <div
              className="os-section__body"
              style={{ padding: "1rem 1.5rem" }}
            >
              {/* Progress bar */}
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span style={{ color: "#525252" }}>Sessions marked</span>
                  <span style={{ fontWeight: 600, color: "#161616" }}>
                    1 / 5
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    background: "#e0e0e0",
                    borderRadius: "3px",
                  }}
                >
                  <div
                    style={{
                      width: "20%",
                      height: "100%",
                      background: ACCENT,
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
              {[
                { label: "Marked", value: 1, color: "#24a148" },
                { label: "Pending", value: 4, color: "#f1c21b" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.4rem 0",
                    borderBottom: "1px solid #f4f4f4",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "#525252" }}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
              <Link
                to="/attendance"
                style={{
                  display: "block",
                  marginTop: "0.75rem",
                  fontSize: "0.8125rem",
                  color: ACCENT,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Mark remaining sessions →
              </Link>
            </div>
          </div>

          {/* Attendance by class */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Class Attendance Rate</h2>
              <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>
                This month
              </span>
            </div>
            <div>
              {TOP_CLASSES.map((c, i) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1.5rem",
                    borderBottom:
                      i < TOP_CLASSES.length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <Link
                    to={`/classes/CL-00${i + 1}`}
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: ACCENT,
                      textDecoration: "none",
                      width: "2.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {c.name}
                  </Link>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: "5px",
                        background: "#e0e0e0",
                        borderRadius: "3px",
                      }}
                    >
                      <div
                        style={{
                          width: `${c.rate}%`,
                          height: "100%",
                          background:
                            c.rate >= 90
                              ? "#24a148"
                              : c.rate >= 80
                                ? ACCENT
                                : "#f1c21b",
                          borderRadius: "3px",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#161616",
                      width: "2.5rem",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {c.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic year */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Academic Year</h2>
            </div>
            <div
              className="os-section__body"
              style={{ padding: "1rem 1.5rem" }}
            >
              {[
                ["Current Year", "2025 / 2026"],
                ["Term", "Term 2"],
                ["School Days", "142 of 210"],
                ["Next Holiday", "2026-07-04"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.4rem 0",
                    borderBottom: "1px solid #f4f4f4",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "#525252" }}>{label}</span>
                  <span style={{ fontWeight: 500, color: "#161616" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
