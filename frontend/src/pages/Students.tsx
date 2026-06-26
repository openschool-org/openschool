import { Link } from "react-router";
import { Search, Add, Filter, ChevronRight } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const SAMPLE_STUDENTS = [
  { id: "S-0001", name: "Kavinda Perera", grade: "Grade 10", class: "10-A", gender: "Male", status: "Active" },
  { id: "S-0002", name: "Nimasha Silva", grade: "Grade 11", class: "11-B", gender: "Female", status: "Active" },
  { id: "S-0003", name: "Dulith Fernando", grade: "Grade 9", class: "9-A", gender: "Male", status: "Active" },
  { id: "S-0004", name: "Thilini Jayawardena", grade: "Grade 10", class: "10-B", gender: "Female", status: "Active" },
  { id: "S-0005", name: "Ashan Bandara", grade: "Grade 8", class: "8-A", gender: "Male", status: "Inactive" },
];

export default function Students() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Students</h1>
          <p className="os-page__subtitle">Manage student enrolment and profiles</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/students/new">
          Enrol Student
        </Button>
      </div>

      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search">
            <Search size={16} className="os-search__icon" />
            <input className="os-search__input" placeholder="Search by name, ID or class…" />
          </div>
          <Button renderIcon={Filter} kind="ghost" size="md">Filter</Button>
        </div>

        <div className="os-section__header">
          <h2 className="os-section__title">All Students</h2>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{SAMPLE_STUDENTS.length} records (sample)</span>
        </div>

        <table className="os-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Grade</th>
              <th>Class</th>
              <th>Gender</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_STUDENTS.map(s => (
              <tr key={s.id}>
                <td><span className="os-table__mono">{s.id}</span></td>
                <td>
                  <Link to={`/students/${s.id}`} className="os-table__link">{s.name}</Link>
                </td>
                <td><span className="os-table__muted">{s.grade}</span></td>
                <td>{s.class}</td>
                <td><span className="os-table__muted">{s.gender}</span></td>
                <td>
                  <Tag type={s.status === "Active" ? "blue" : "gray"} size="sm">{s.status}</Tag>
                </td>
                <td style={{ width: "2rem" }}>
                  <ChevronRight size={16} style={{ fill: "#8d8d8d" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
