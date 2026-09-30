import { Link } from "react-router";
import type { useClass } from "@/features/academics/queries/useClasses";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { Student } from "@/features/students/api/student";
import Avatar from "@/shared/ui/Avatar";
import SectionCard from "@/shared/ui/SectionCard";
import { displayName } from "@/shared/lib/name";

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
      <SectionCard title="Class information" className="os-mt-4">
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
      </SectionCard>

      <SectionCard title="Class teacher">
        <div>
          {formTeacher ? (
            <Link
              to={`/teachers/${formTeacher.id}`} className="os-flex os-items-center os-gap-3 os-no-underline"
            >
              <Avatar name={displayName(formTeacher)} size="sm" />
              <div>
                <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-primary"
                >
                  {displayName(formTeacher)}
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
      </SectionCard>
    </>
  );
}
