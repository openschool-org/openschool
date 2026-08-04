import { Link } from "react-router";
import { CheckmarkFilled } from "@carbon/icons-react";
import type { MyClass } from "../../../queries/useTeachers";
import type { AttendanceSession } from "../../../services/attendance";

const ACCENT = "#406AAF";

export default function MyClassesPanel({
  myClasses,
  studentCountByClass,
  todaySessionByClass,
}: {
  myClasses: MyClass[];
  studentCountByClass: Map<string, number>;
  todaySessionByClass: Map<string, AttendanceSession>;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">My Classes</h2>
        <Link to="/t/classes" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View →</Link>
      </div>
      <div>
        {myClasses.length === 0 ? (
          <p style={{ padding: "1.5rem", color: "#8d8d8d", fontSize: "0.8125rem" }}>No classes assigned yet.</p>
        ) : (
          myClasses.map((cls, i) => (
            <div key={cls.class_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: i < myClasses.length - 1 ? "1px solid #f4f4f4" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>{cls.grade_name} — {cls.class_name}</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{cls.subjects.join(", ")} · {studentCountByClass.get(cls.class_id) ?? 0} students</p>
              </div>
              <Link to="/t/classes" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                <CheckmarkFilled size={14} style={{ fill: todaySessionByClass.has(cls.class_id) ? "#24a148" : "#e0e0e0" }} />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
