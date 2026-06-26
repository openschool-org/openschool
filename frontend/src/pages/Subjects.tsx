import { Book, Add } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const SUBJECT_PLACEHOLDERS = [
  { name: "Mathematics", code: "MATH", type: "Core", grades: "6–11" },
  { name: "Science", code: "SCI", type: "Core", grades: "6–11" },
  { name: "Sinhala", code: "SIN", type: "Core", grades: "6–11" },
  { name: "English", code: "ENG", type: "Core", grades: "6–11" },
  { name: "History", code: "HIS", type: "Core", grades: "6–11" },
  { name: "Art", code: "ART", type: "Optional", grades: "9–11" },
];

export default function Subjects() {
  return (
    <div className="os-page">
      <div className="os-page__header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="os-page__title">Subjects</h1>
          <p className="os-page__subtitle">Curriculum subjects and optional subject buckets</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" style={{ backgroundColor: "#406AAF", borderColor: "#406AAF" }}>
          Add Subject
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">All Subjects</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0", backgroundColor: "#f4f4f4" }}>
              {["Subject", "Code", "Type", "Grades"].map(h => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem 1.5rem",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#525252",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBJECT_PLACEHOLDERS.map((s, i) => (
              <tr
                key={s.code}
                style={{
                  borderBottom: i < SUBJECT_PLACEHOLDERS.length - 1 ? "1px solid #e0e0e0" : "none",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f4f4f4")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={{ padding: "0.875rem 1.5rem", fontWeight: 500, fontSize: "0.875rem", color: "#161616" }}>
                  <Book size={16} style={{ fill: "#406AAF", marginRight: "0.5rem", verticalAlign: "middle" }} />
                  {s.name}
                </td>
                <td style={{ padding: "0.875rem 1.5rem", fontSize: "0.875rem", color: "#525252", fontFamily: "IBM Plex Mono, monospace" }}>
                  {s.code}
                </td>
                <td style={{ padding: "0.875rem 1.5rem" }}>
                  <Tag type={s.type === "Core" ? "teal" : "purple"} size="sm">
                    {s.type}
                  </Tag>
                </td>
                <td style={{ padding: "0.875rem 1.5rem", fontSize: "0.875rem", color: "#525252" }}>
                  {s.grades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
