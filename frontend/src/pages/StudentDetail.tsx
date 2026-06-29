import { Link, useParams } from "react-router";
import { Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel } from "@carbon/react";
import { Edit, ArrowLeft, Building } from "@carbon/icons-react";

const STUDENT = {
  id: "S-0001",
  name: "Kavinda Perera",
  initials: "KP",
  grade: "Grade 10",
  class: "10-A",
  classId: "CL-001",
  gender: "Male",
  dob: "2010-03-15",
  age: 15,
  nic: "—",
  phone: "077 123 4567",
  email: "—",
  address: "45, Galle Road, Colombo 03",
  district: "Colombo",
  admissionNo: "ADM-2020-0145",
  admissionDate: "2020-01-06",
  status: "Active",
  stream: "Science",
  guardian: { name: "Saman Perera", relation: "Father", phone: "071 234 5678", email: "saman@example.com" },
};

const ATTENDANCE_ROWS = [
  { date: "2026-06-26", subject: "Mathematics", teacher: "Priya Rathnayake",       status: "Present" },
  { date: "2026-06-26", subject: "English",     teacher: "Suresh Dissanayake",     status: "Present" },
  { date: "2026-06-25", subject: "Science",     teacher: "Priya Rathnayake",       status: "Absent"  },
  { date: "2026-06-25", subject: "History",     teacher: "Chamari Wickramasinghe", status: "Present" },
  { date: "2026-06-24", subject: "Mathematics", teacher: "Priya Rathnayake",       status: "Late"    },
  { date: "2026-06-24", subject: "Sinhala",     teacher: "Nimal Jayasuriya",       status: "Present" },
];

const present = ATTENDANCE_ROWS.filter(r => r.status === "Present").length;
const absent  = ATTENDANCE_ROWS.filter(r => r.status === "Absent").length;
const late    = ATTENDANCE_ROWS.filter(r => r.status === "Late").length;
const rate    = Math.round((present / ATTENDANCE_ROWS.length) * 100);

export default function StudentDetail() {
  const { id } = useParams();
  const student = { ...STUDENT, id: id ?? STUDENT.id };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>

      <div className="os-profile__banner">
        <div className="os-profile__avatar">{student.initials}</div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{student.name}</p>
          <p className="os-profile__meta">
            {student.grade} · Class {student.class} · {student.stream} Stream · {student.admissionNo}
          </p>
        </div>
        <div className="os-profile__actions">
          <Tag type="blue" size="sm">{student.status}</Tag>
          <Button renderIcon={Edit} kind="ghost" size="sm">Edit</Button>
          <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/students">Back</Button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          <div>
            <Tabs>
              <TabList aria-label="Student sections">
                <Tab>Profile</Tab>
                <Tab>Attendance</Tab>
                <Tab>Guardian</Tab>
              </TabList>
              <TabPanels>

                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header"><h2 className="os-section__title">Personal Details</h2></div>
                    <div className="os-kv-grid">
                      {[
                        ["Full Name",         student.name],
                        ["Gender",            student.gender],
                        ["Date of Birth",     student.dob],
                        ["Age",               `${student.age} years`],
                        ["NIC / Birth Cert.", student.nic],
                        ["Phone",             student.phone],
                        ["Email",             student.email],
                        ["District",          student.district],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                      <div className="os-kv-item" style={{ gridColumn: "1 / -1" }}>
                        <p className="os-kv-item__label">Address</p>
                        <p className="os-kv-item__value">{student.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="os-section">
                    <div className="os-section__header"><h2 className="os-section__title">Enrolment</h2></div>
                    <div className="os-kv-grid">
                      {[
                        ["Admission No.",  student.admissionNo],
                        ["Admitted",       student.admissionDate],
                        ["Grade",          student.grade],
                        ["Class",          student.class],
                        ["Stream",         student.stream],
                        ["Academic Year",  "2025 / 2026"],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginTop: "1rem", marginBottom: "1rem" }}>
                    {[
                      { label: "Present", value: present, color: "#24a148" },
                      { label: "Absent",  value: absent,  color: "#da1e28" },
                      { label: "Late",    value: late,    color: "#f1c21b" },
                      { label: "Rate",    value: `${rate}%`, color: "#406AAF" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: "#fff", border: "1px solid #e0e0e0", borderTop: `3px solid ${color}`, padding: "0.875rem 1rem" }}>
                        <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#525252" }}>{label}</p>
                        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 300, color: "#161616" }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="os-section">
                    <div className="os-section__header">
                      <h2 className="os-section__title">Recent Records</h2>
                      <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>Last 30 days</span>
                    </div>
                    <table className="os-table">
                      <thead>
                        <tr><th>Date</th><th>Subject</th><th>Teacher</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {ATTENDANCE_ROWS.map((r, i) => (
                          <tr key={i}>
                            <td className="os-table__mono">{r.date}</td>
                            <td>{r.subject}</td>
                            <td className="os-table__muted">{r.teacher}</td>
                            <td>
                              <Tag type={r.status === "Present" ? "blue" : r.status === "Absent" ? "red" : "warm-gray"} size="sm">
                                {r.status}
                              </Tag>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header"><h2 className="os-section__title">Guardian Information</h2></div>
                    <div className="os-kv-grid">
                      {[
                        ["Name",         student.guardian.name],
                        ["Relationship", student.guardian.relation],
                        ["Phone",        student.guardian.phone],
                        ["Email",        student.guardian.email],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabPanel>

              </TabPanels>
            </Tabs>
          </div>

          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Quick Info</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Student ID", student.id],
                  ["Status",     student.status],
                  ["Grade",      student.grade],
                  ["Class",      student.class],
                  ["Admitted",   student.admissionDate],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Class</h2></div>
              <div className="os-section__body">
                <Link to={`/classes/${student.classId}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                  <Building size={16} style={{ fill: "#406AAF" }} />
                  <span style={{ fontSize: "0.875rem", color: "#406AAF", fontWeight: 500 }}>
                    {student.class} — {student.grade}
                  </span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
