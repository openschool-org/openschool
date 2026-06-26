import { Link, useParams } from "react-router";
import { Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel } from "@carbon/react";
import { Edit, ArrowLeft, Book, UserMultiple } from "@carbon/icons-react";

const TEACHER = {
  id: "T-0001",
  name: "Priya Rathnayake",
  initials: "PR",
  employeeId: "EMP-0145",
  department: "Science",
  employmentType: "Permanent",
  gender: "Female",
  dob: "1985-07-22",
  nic: "198572234567V",
  phone: "077 345 6789",
  email: "priya.r@school.lk",
  address: "23, Kandy Road, Kelaniya",
  joinDate: "2010-01-15",
  status: "Active",
  subjects: ["Mathematics", "Science"],
  classes: [
    { id: "CL-001", name: "10-A", grade: "Grade 10", stream: "Science", students: 38 },
    { id: "CL-003", name: "11-A", grade: "Grade 11", stream: "Science", students: 36 },
  ],
};

const RECENT_SESSIONS = [
  { date: "2026-06-26", class: "10-A", subject: "Mathematics", status: "Marked" },
  { date: "2026-06-26", class: "11-A", subject: "Science",     status: "Pending" },
  { date: "2026-06-25", class: "10-A", subject: "Mathematics", status: "Marked" },
  { date: "2026-06-25", class: "11-A", subject: "Science",     status: "Marked" },
];

export default function TeacherDetail() {
  const { id } = useParams();
  const teacher = { ...TEACHER, id: id ?? TEACHER.id };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>

      {/* Light profile banner */}
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{teacher.initials}</div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{teacher.name}</p>
          <p className="os-profile__meta">
            {teacher.department} · {teacher.employmentType} · {teacher.employeeId}
          </p>
        </div>
        <div className="os-profile__actions">
          <Tag type="blue" size="sm">{teacher.status}</Tag>
          <Button renderIcon={Edit} kind="ghost" size="sm">Edit</Button>
          <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/teachers">
            Back
          </Button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Main content */}
          <div>
            <Tabs>
              <TabList aria-label="Teacher sections">
                <Tab>Profile</Tab>
                <Tab>Classes</Tab>
                <Tab>Sessions</Tab>
              </TabList>
              <TabPanels>

                {/* Profile */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header"><h2 className="os-section__title">Personal Details</h2></div>
                    <div className="os-kv-grid">
                      {[
                        ["Full Name",   teacher.name],
                        ["Gender",      teacher.gender],
                        ["Date of Birth", teacher.dob],
                        ["NIC",         teacher.nic],
                        ["Phone",       teacher.phone],
                        ["Email",       teacher.email],
                        ["Join Date",   teacher.joinDate],
                        ["Department",  teacher.department],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                      <div className="os-kv-item" style={{ gridColumn: "1 / -1" }}>
                        <p className="os-kv-item__label">Address</p>
                        <p className="os-kv-item__value">{teacher.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="os-section">
                    <div className="os-section__header"><h2 className="os-section__title">Subjects</h2></div>
                    <div className="os-section__body" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {teacher.subjects.map(s => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", border: "1px solid #e0e0e0", background: "#f4f4f4" }}>
                          <Book size={14} style={{ fill: "#406AAF" }} />
                          <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabPanel>

                {/* Classes */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Assigned Classes</h2>
                      <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{teacher.classes.length} classes</span>
                    </div>
                    <table className="os-table">
                      <thead>
                        <tr><th>Class</th><th>Grade</th><th>Stream</th><th>Students</th></tr>
                      </thead>
                      <tbody>
                        {teacher.classes.map(c => (
                          <tr key={c.name}>
                            <td><Link to={`/classes/${c.id}`} className="os-table__link">{c.name}</Link></td>
                            <td className="os-table__muted">{c.grade}</td>
                            <td><Tag type="blue" size="sm">{c.stream}</Tag></td>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <UserMultiple size={13} style={{ fill: "#8d8d8d" }} />{c.students}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>

                {/* Sessions */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Recent Sessions</h2>
                    </div>
                    <table className="os-table">
                      <thead>
                        <tr><th>Date</th><th>Class</th><th>Subject</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {RECENT_SESSIONS.map((s, i) => (
                          <tr key={i}>
                            <td className="os-table__mono">{s.date}</td>
                            <td>{s.class}</td>
                            <td className="os-table__muted">{s.subject}</td>
                            <td><Tag type={s.status === "Marked" ? "blue" : "gray"} size="sm">{s.status}</Tag></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  ["Employee ID",    teacher.employeeId],
                  ["Status",         teacher.status],
                  ["Employment",     teacher.employmentType],
                  ["Department",     teacher.department],
                  ["Classes",        teacher.classes.length],
                  ["Subjects",       teacher.subjects.length],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">This Week</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Sessions Taken", "3"],
                  ["Sessions Pending", "1"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
