import { Link } from "react-router";
import { Search, Add, ChevronRight } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const SAMPLE_TEACHERS = [
  { id: "T-0001", name: "Priya Rathnayake", subjects: ["Mathematics", "Science"], classes: 4, status: "Active" },
  { id: "T-0002", name: "Suresh Dissanayake", subjects: ["English"], classes: 6, status: "Active" },
  { id: "T-0003", name: "Chamari Wickramasinghe", subjects: ["History", "Geography"], classes: 3, status: "Active" },
  { id: "T-0004", name: "Nimal Jayasuriya", subjects: ["Sinhala"], classes: 5, status: "Active" },
  { id: "T-0005", name: "Anoma de Silva", subjects: ["Art", "Music"], classes: 2, status: "On Leave" },
];

export default function Teachers() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teachers</h1>
          <p className="os-page__subtitle">Manage teacher profiles and subject assignments</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/teachers/new">
          Add Teacher
        </Button>
      </div>

      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search">
            <Search size={16} className="os-search__icon" />
            <input className="os-search__input" placeholder="Search by name or subject…" />
          </div>
        </div>

        <div className="os-section__header">
          <h2 className="os-section__title">All Teachers</h2>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{SAMPLE_TEACHERS.length} records (sample)</span>
        </div>

        <table className="os-table">
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Full Name</th>
              <th>Subjects</th>
              <th>Classes</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TEACHERS.map(t => (
              <tr key={t.id}>
                <td><span className="os-table__mono">{t.id}</span></td>
                <td>
                  <Link to={`/teachers/${t.id}`} className="os-table__link">{t.name}</Link>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {t.subjects.map(s => (
                      <Tag key={s} type="blue" size="sm">{s}</Tag>
                    ))}
                  </div>
                </td>
                <td><span className="os-table__muted">{t.classes} assigned</span></td>
                <td>
                  <Tag type={t.status === "Active" ? "blue" : "warm-gray"} size="sm">{t.status}</Tag>
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
