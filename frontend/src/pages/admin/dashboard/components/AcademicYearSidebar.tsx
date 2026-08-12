import { Link } from "react-router";
import { SkeletonText } from "@carbon/react";
import type { AcademicYear } from "../../../../services/academicYear";
import { ACCENT } from "../constants";

export default function AcademicYearSidebar({
  currentYear,
  loading,
}: {
  currentYear: AcademicYear | null;
  loading: boolean;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Academic Year</h2>
        <Link to="/academic-years" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
          Manage →
        </Link>
      </div>
      <div className="os-section__body" style={{ padding: "1rem 1.5rem" }}>
        {loading ? (
          <SkeletonText width="60%" />
        ) : !currentYear ? (
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#8d8d8d" }}>
            No academic year is marked current yet.
          </p>
        ) : (
          [
            ["Current Year", currentYear.label],
            [
              "Period",
              currentYear.start_date && currentYear.end_date
                ? `${new Date(currentYear.start_date).toLocaleDateString("en-LK", { month: "short", year: "numeric" })} – ${new Date(currentYear.end_date).toLocaleDateString("en-LK", { month: "short", year: "numeric" })}`
                : "-",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}
            >
              <span style={{ color: "#525252" }}>{label}</span>
              <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
