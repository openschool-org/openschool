import { useQueries } from "@tanstack/react-query";
import { Tag } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import { useMyTeacherProfile, useTeacherSubjects, useMyClasses } from "@/features/teachers/queries/useTeachers";
import { studentsByClassOptions } from "@/features/students/queries/useStudents";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import InfoRow from "@/shared/ui/InfoRow";
import { getInitials } from "@/shared/lib/name";

export default function TeacherProfile() {
  const { data: profile, isLoading, isError, refetch } = useMyTeacherProfile();
  const { data: subjects } = useTeacherSubjects(profile?.id ?? "");
  const { classes: myClasses } = useMyClasses();

  const classIds = myClasses.map((c) => c.class_id);
  const studentQueries = useQueries({ queries: classIds.map(studentsByClassOptions) });
  const sessionQueries = useQueries({ queries: classIds.map(classSessionsOptions) });
  const studentsTaught = new Set(studentQueries.flatMap((q) => (q.data ?? []).map((s) => s.id))).size;
  const sessionsTaken = sessionQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load your profile" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{getInitials(profile.full_name)}</div>
        <div className="os-flex-1">
          <p className="os-profile__name">{profile.title ? `${profile.title} ` : ""}{profile.full_name}</p>
          <p className="os-profile__meta">{profile.employee_number}</p>
        </div>
        <div className="os-profile__actions">
          <Tag type={profile.is_active ? "green" : "gray"} size="sm">{profile.is_active ? "Active" : "Inactive"}</Tag>
        </div>
      </div>

      <div className="os-py-6 os-px-8">
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          {/* Main */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Personal details</h2></div>
              <div className="os-kv-grid">
                {[
                  ["Full name", profile.full_name],
                  ["Title", profile.title ?? "-"],
                  ["Gender", profile.gender ? profile.gender[0].toUpperCase() + profile.gender.slice(1) : "-"],
                  ["Phone", profile.phone ?? "-"],
                  ["Employee number", profile.employee_number],
                  ["Joined date", profile.joined_date ?? "-"],
                ].map(([label, value]) => (
                  <div key={label} className="os-kv-item">
                    <p className="os-kv-item__label">{label}</p>
                    <p className="os-kv-item__value">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Subjects</h2></div>
              <div className="os-section__body os-flex os-gap-2 os-wrap">
                {!subjects || subjects.length === 0 ? (
                  <p className="os-c-tertiary os-text-sm">No subjects assigned yet.</p>
                ) : (
                  subjects.map((s) => (
                    <div key={s.id} className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-border os-bg-layer-hover">
                      <Book size={14} className="os-fill-accent" />
                      <span className="os-text-md os-fw-500">{s.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Quick info</h2></div>
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Employee ID" value={profile.employee_number} />
                <InfoRow label="Status" value={profile.is_active ? "Active" : "Inactive"} />
                <InfoRow label="Subjects" value={subjects?.length ?? 0} />
                <InfoRow label="Classes" value={myClasses.length} />
                <InfoRow label="Joined" value={profile.joined_date ?? "-"} divider={false} />
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">This year</h2></div>
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Sessions taken" value={sessionsTaken} bold accent />
                <InfoRow label="Students taught" value={studentsTaught} bold accent divider={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
