import { Link } from "react-router";
import { Building, Add, ChevronRight, UserMultiple } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const SAMPLE_CLASSES = [
  { id: "CL-001", name: "10-A", grade: "Grade 10", stream: "Science", students: 38, teacher: "Priya Rathnayake" },
  { id: "CL-002", name: "10-B", grade: "Grade 10", stream: "Arts", students: 35, teacher: "Chamari Wickramasinghe" },
  { id: "CL-003", name: "11-A", grade: "Grade 11", stream: "Science", students: 36, teacher: "Suresh Dissanayake" },
  { id: "CL-004", name: "11-B", grade: "Grade 11", stream: "Commerce", students: 40, teacher: "Nimal Jayasuriya" },
  { id: "CL-005", name: "9-A", grade: "Grade 9", stream: "General", students: 42, teacher: "Anoma de Silva" },
  { id: "CL-006", name: "8-A", grade: "Grade 8", stream: "General", students: 44, teacher: "Priya Rathnayake" },
];

const STREAM_COLORS: Record<string, "blue" | "purple" | "teal" | "green"> = {
  Science: "blue",
  Arts: "purple",
  Commerce: "teal",
  General: "green",
};

export default function Classes() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Classes</h1>
          <p className="os-page__subtitle">Grades, streams and class groups for the current academic year</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/classes/new">
          Add Class
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">All Classes</h2>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{SAMPLE_CLASSES.length} classes (sample)</span>
        </div>

        <table className="os-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Grade</th>
              <th>Stream</th>
              <th>Class Teacher</th>
              <th>Students</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_CLASSES.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Building size={16} style={{ fill: "#406AAF", flexShrink: 0 }} />
                    <Link to={`/classes/${c.id}`} className="os-table__link">{c.name}</Link>
                  </div>
                </td>
                <td><span className="os-table__muted">{c.grade}</span></td>
                <td>
                  <Tag type={STREAM_COLORS[c.stream] ?? "gray"} size="sm">{c.stream}</Tag>
                </td>
                <td>
                  <Link to="/teachers" className="os-table__muted" style={{ textDecoration: "none" }}>
                    {c.teacher}
                  </Link>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <UserMultiple size={14} style={{ fill: "#8d8d8d" }} />
                    <span>{c.students}</span>
                  </div>
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
