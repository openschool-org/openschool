import { Calendar, Add, Checkmark } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";

const YEARS_PLACEHOLDER = [
  { year: "2025 / 2026", status: "Current", start: "Jan 2025", end: "Dec 2026" },
  { year: "2024 / 2025", status: "Closed", start: "Jan 2024", end: "Dec 2025" },
];

export default function AcademicYears() {
  return (
    <div className="os-page">
      <div className="os-page__header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="os-page__title">Academic Years</h1>
          <p className="os-page__subtitle">Manage academic year periods for the school</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" style={{ backgroundColor: "#406AAF", borderColor: "#406AAF" }}>
          New Academic Year
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Academic Years</h2>
        </div>
        <div>
          {YEARS_PLACEHOLDER.map((y, i) => (
            <div
              key={y.year}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderBottom: i < YEARS_PLACEHOLDER.length - 1 ? "1px solid #e0e0e0" : "none",
                gap: "1rem",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f4f4f4")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Calendar size={20} style={{ fill: y.status === "Current" ? "#406AAF" : "#8d8d8d", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.125rem", fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>
                  {y.year}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                  {y.start} — {y.end}
                </p>
              </div>
              <Tag type={y.status === "Current" ? "teal" : "gray"} size="sm">
                {y.status === "Current" && <Checkmark size={12} style={{ marginRight: "4px" }} />}
                {y.status}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
