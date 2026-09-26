import { Link } from "react-router";
import type { useClass } from "@/features/academics/queries/useClasses";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { Student } from "@/features/students/api/student";
import Avatar from "@/shared/ui/Avatar";
import SectionHeader from "@/shared/ui/SectionHeader";

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
      <div className="os-section os-mt-4">
        <SectionHeader title="Class information" />
        <div className="os-kv-grid">
          {[
            ["Class name", cls.name],
            ["Grade", gradeName ?? "-"],
            ["Stream", streamName ?? "None"],
            ["Sub-stream", streamGroupName ?? "None"],
            ["Medium", mediumName ?? "Not designated"],
            ["Home classroom", homeClassroomName ?? "Not assigned"],
            ["Academic year", academicYearLabel ?? "-"],
            ["Girl monitor", girlMonitor?.full_name ?? "Unassigned"],
            ["Boy monitor", boyMonitor?.full_name ?? "Unassigned"],
          ].map(([label, value]) => (
            <div key={label} className="os-kv-item">
              <p className="os-kv-item__label">{label}</p>
              <p className="os-kv-item__value">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="os-section">
        <SectionHeader title="Class teacher" />
        <div className="os-section__body">
          {formTeacher ? (
            <Link
              to={`/teachers/${formTeacher.id}`} className="os-flex os-items-center os-gap-3 os-no-underline"
            >
              <Avatar name={formTeacher.full_name} size="sm" />
              <div>
                <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-primary"
                >
                  {formTeacher.full_name}
                </p>
                <p className="os-m-0 os-text-xs os-c-accent">View profile →</p>
              </div>
            </Link>
          ) : (
            <span className="os-text-md os-c-tertiary">
              No class teacher assigned.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
