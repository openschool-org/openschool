import { Link, useParams } from "react-router";
import { Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel } from "@carbon/react";
import { ArrowLeft, Edit, Add, UserMultiple, EventSchedule, CheckmarkFilled, Time } from "@carbon/icons-react";

const CLASS_DATA: Record<string, {
  name: string; grade: string; stream: string; teacher: string; teacherId: string;
  room: string; capacity: number; academicYear: string;
}> = {
  "CL-001": { name: "10-A", grade: "Grade 10", stream: "Science",   teacher: "Priya Rathnayake",       teacherId: "T-0001", room: "Room 204", capacity: 45, academicYear: "2025/2026" },
  "CL-002": { name: "10-B", grade: "Grade 10", stream: "Arts",      teacher: "Chamari Wickramasinghe", teacherId: "T-0003", room: "Room 106", capacity: 45, academicYear: "2025/2026" },
  "CL-003": { name: "11-A", grade: "Grade 11", stream: "Science",   teacher: "Suresh Dissanayake",     teacherId: "T-0002", room: "Room 301", capacity: 45, academicYear: "2025/2026" },
  "CL-004": { name: "11-B", grade: "Grade 11", stream: "Commerce",  teacher: "Nimal Jayasuriya",       teacherId: "T-0004", room: "Room 215", capacity: 45, academicYear: "2025/2026" },
  "CL-005": { name: "9-A",  grade: "Grade 9",  stream: "General",   teacher: "Anoma de Silva",         teacherId: "T-0005", room: "Room 112", capacity: 45, academicYear: "2025/2026" },
  "CL-006": { name: "8-A",  grade: "Grade 8",  stream: "General",   teacher: "Priya Rathnayake",       teacherId: "T-0001", room: "Room 205", capacity: 45, academicYear: "2025/2026" },
};

const STUDENTS = [
  { id: "S-0001", name: "Kavinda Perera",     admNo: "ADM-2020-0145", gender: "Male",   status: "Active" },
  { id: "S-0002", name: "Nimasha Silva",       admNo: "ADM-2020-0162", gender: "Female", status: "Active" },
  { id: "S-0003", name: "Dulith Fernando",     admNo: "ADM-2021-0031", gender: "Male",   status: "Active" },
  { id: "S-0004", name: "Thilini Jayawardena", admNo: "ADM-2020-0178", gender: "Female", status: "Active" },
  { id: "S-0005", name: "Ashan Bandara",       admNo: "ADM-2021-0055", gender: "Male",   status: "Active" },
  { id: "S-0006", name: "Sachini Rajapaksa",   admNo: "ADM-2020-0193", gender: "Female", status: "Active" },
  { id: "S-0007", name: "Ravindu Madushanka",  admNo: "ADM-2021-0067", gender: "Male",   status: "Active" },
  { id: "S-0008", name: "Dilini Kumari",       admNo: "ADM-2020-0211", gender: "Female", status: "Active" },
];

const SESSIONS = [
  { id: "SES-001", subject: "Mathematics", date: "2026-06-26", time: "08:00", status: "Pending", present: null, absent: null },
  { id: "SES-002", subject: "English",     date: "2026-06-26", time: "09:50", status: "Pending", present: null, absent: null },
  { id: "SES-003", subject: "Science",     date: "2026-06-25", time: "08:00", status: "Marked",  present: 36,   absent: 2    },
  { id: "SES-004", subject: "Mathematics", date: "2026-06-25", time: "09:50", status: "Marked",  present: 37,   absent: 1    },
  { id: "SES-005", subject: "History",     date: "2026-06-24", time: "08:00", status: "Marked",  present: 35,   absent: 3    },
];

const STREAM_COLOR: Record<string, "blue" | "purple" | "teal" | "green"> = {
  Science: "blue", Arts: "purple", Commerce: "teal", General: "green",
};

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const cls = CLASS_DATA[id ?? "CL-001"] ?? CLASS_DATA["CL-001"];
  const initials = cls.name;

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>

      {/* Light profile banner */}
      <div className="os-profile__banner">
        <div className="os-profile__avatar" style={{ borderRadius: "6px", fontSize: "0.875rem", letterSpacing: "0" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{cls.grade} — Class {cls.name}</p>
          <p className="os-profile__meta">
            {cls.stream} Stream · {cls.room} · Class Teacher: {cls.teacher} · {cls.academicYear}
          </p>
        </div>
        <div className="os-profile__actions">
          <Tag type={STREAM_COLOR[cls.stream] ?? "gray"} size="sm">{cls.stream}</Tag>
          <Button renderIcon={Edit} kind="ghost" size="sm">Edit</Button>
          <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/classes">Back</Button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Main tabs */}
          <div>
            <Tabs>
              <TabList aria-label="Class sections">
                <Tab>Students</Tab>
                <Tab>Attendance</Tab>
                <Tab>Details</Tab>
              </TabList>
              <TabPanels>

                {/* Students */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Enrolled Students</h2>
                      <Button renderIcon={Add} kind="ghost" size="sm" as={Link} to="/students/new">Enrol</Button>
                    </div>
                    <table className="os-table">
                      <thead>
                        <tr><th>#</th><th>Name</th><th>Adm. No.</th><th>Gender</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {STUDENTS.map((s, i) => (
                          <tr key={s.id}>
                            <td style={{ color: "#8d8d8d", fontSize: "0.75rem", fontFamily: "IBM Plex Mono, monospace" }}>{i + 1}</td>
                            <td><Link to={`/students/${s.id}`} className="os-table__link">{s.name}</Link></td>
                            <td className="os-table__mono">{s.admNo}</td>
                            <td className="os-table__muted">{s.gender}</td>
                            <td><Tag type="blue" size="sm">{s.status}</Tag></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "#525252" }}>
                      <UserMultiple size={14} style={{ fill: "#8d8d8d" }} />
                      {STUDENTS.length} of {cls.capacity} capacity
                    </div>
                  </div>
                </TabPanel>

                {/* Attendance */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Recent Sessions</h2>
                      <Button renderIcon={Add} kind="ghost" size="sm">New Session</Button>
                    </div>
                    <table className="os-table">
                      <thead>
                        <tr><th>Date</th><th>Time</th><th>Subject</th><th>Present</th><th>Absent</th><th>Status</th><th></th></tr>
                      </thead>
                      <tbody>
                        {SESSIONS.map(s => (
                          <tr key={s.id}>
                            <td className="os-table__mono">{s.date}</td>
                            <td className="os-table__mono">{s.time}</td>
                            <td>{s.subject}</td>
                            <td>
                              {s.present !== null
                                ? <span style={{ color: "#24a148", fontWeight: 600 }}>{s.present}</span>
                                : <span style={{ color: "#c6c6c6" }}>—</span>}
                            </td>
                            <td>
                              {s.absent !== null
                                ? <span style={{ color: "#da1e28", fontWeight: 600 }}>{s.absent}</span>
                                : <span style={{ color: "#c6c6c6" }}>—</span>}
                            </td>
                            <td>
                              <Tag type={s.status === "Marked" ? "blue" : "gray"} size="sm">
                                {s.status === "Marked"
                                  ? <CheckmarkFilled size={12} style={{ marginRight: "3px", verticalAlign: "middle" }} />
                                  : <Time size={12} style={{ marginRight: "3px", verticalAlign: "middle" }} />}
                                {s.status}
                              </Tag>
                            </td>
                            <td>
                              {s.status === "Pending"
                                ? <Button kind="primary" size="sm" as={Link} to={`/attendance/sessions/${s.id}/mark`}>Mark</Button>
                                : <Button kind="ghost" size="sm" as={Link} to={`/attendance/sessions/${s.id}/mark`} style={{ color: "#406AAF" }}>View</Button>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>

                {/* Details */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header"><h2 className="os-section__title">Class Information</h2></div>
                    <div className="os-kv-grid">
                      {[
                        ["Class Name",    cls.name],
                        ["Grade",         cls.grade],
                        ["Stream",        cls.stream],
                        ["Classroom",     cls.room],
                        ["Capacity",      cls.capacity],
                        ["Academic Year", cls.academicYear],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="os-section">
                    <div className="os-section__header"><h2 className="os-section__title">Class Teacher</h2></div>
                    <div className="os-section__body">
                      <Link to={`/teachers/${cls.teacherId}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
                        <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "#406AAF", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                          {cls.teacher.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{cls.teacher}</p>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#406AAF" }}>View profile →</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </TabPanel>

              </TabPanels>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Quick Info</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Grade",        cls.grade],
                  ["Stream",       cls.stream],
                  ["Room",         cls.room],
                  ["Enrolled",     `${STUDENTS.length} / ${cls.capacity}`],
                  ["Academic Year",cls.academicYear],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Attendance Summary</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Sessions (month)", SESSIONS.length],
                  ["Marked",  SESSIONS.filter(s => s.status === "Marked").length],
                  ["Pending", SESSIONS.filter(s => s.status === "Pending").length],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "#161616" }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: "0.75rem" }}>
                  <Button kind="ghost" size="sm" as={Link} to="/attendance" style={{ color: "#406AAF", padding: 0 }}>
                    <EventSchedule size={14} style={{ marginRight: "0.35rem" }} /> View all sessions →
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
