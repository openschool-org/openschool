import { Link } from "react-router";
import type { useClass } from "../../../../queries/useClasses";
import type { Teacher } from "../../../../services/teacher";
import type { Student } from "../../../../services/student";
import Avatar from "../../../../components/common/Avatar";

interface Props {
  cls: NonNullable<ReturnType<typeof useClass>["data"]>;
  gradeName: string | undefined;
  streamName: string | undefined;
  streamGroupName: string | undefined;
  mediumName: string | undefined;
  homeClassroomName: string | undefined;
  academicYearLabel: string | undefined;
  girlMonitor: Student | undefined;
  boyMonitor: Student | undefined;
  formTeacher: Teacher | undefined;
}

export default function DetailsTab({
  cls,
  gradeName,
  streamName,
  streamGroupName,
  mediumName,
  homeClassroomName,
  academicYearLabel,
  girlMonitor,
  boyMonitor,
  formTeacher,
}: Props) {
  return (
    <>
      <div className="os-section" style={{ marginTop: "1rem" }}>
        <div className="os-section__header">
          <h2 className="os-section__title">Class Information</h2>
        </div>
        <div className="os-kv-grid">
          {[
            ["Class Name", cls.name],
            ["Grade", gradeName ?? "—"],
            ["Stream", streamName ?? "None"],
            ["Sub-stream", streamGroupName ?? "None"],
            ["Medium", mediumName ?? "Not designated"],
            ["Home Classroom", homeClassroomName ?? "Not assigned"],
            ["Academic Year", academicYearLabel ?? "—"],
            ["Girl Monitor", girlMonitor?.full_name ?? "Unassigned"],
            ["Boy Monitor", boyMonitor?.full_name ?? "Unassigned"],
          ].map(([label, value]) => (
            <div key={label} className="os-kv-item">
              <p className="os-kv-item__label">{label}</p>
              <p className="os-kv-item__value">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Class Teacher</h2>
        </div>
        <div className="os-section__body">
          {formTeacher ? (
            <Link
              to={`/teachers/${formTeacher.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textDecoration: "none",
              }}
            >
              <Avatar name={formTeacher.full_name} size="sm" />
              <div>
                <p
                  style={{
                    margin: "0 0 0.1rem",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "#161616",
                  }}
                >
                  {formTeacher.full_name}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#406AAF" }}>View profile →</p>
              </div>
            </Link>
          ) : (
            <span style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
              No class teacher assigned.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
