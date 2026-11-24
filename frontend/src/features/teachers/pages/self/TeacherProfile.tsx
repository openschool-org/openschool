import { useQueries } from "@tanstack/react-query";
import { BookOutlined } from "@ant-design/icons";
import { useMyTeacherProfile, useTeacherSubjects, useMyClasses } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import KeyValueCard from "@/shared/ui/KeyValueCard";
import SectionCard from "@/shared/ui/SectionCard";
import Pill from "@/shared/ui/Pill";
import { capitalize } from "@/shared/lib/text";
import { classLabel } from "@/shared/lib/classLabel";
import { formatDayMonthYear } from "@/shared/lib/date";
import { displayName } from "@/shared/lib/name";

// Same layout as the student profile: personal details beside school details.
export default function TeacherProfile() {
  const { data: profile, isLoading, isError, refetch } = useMyTeacherProfile();
  const { data: subjects } = useTeacherSubjects(profile?.id ?? "");
  const { classes: myClasses } = useMyClasses();

  const sessionQueries = useQueries({ queries: myClasses.map((c) => classSessionsOptions(c.class_id)) });
  // A student is in one class per year, so the class counts add up to distinct students.
  const studentsTaught = myClasses.reduce((n, c) => n + c.studentCount, 0);
  const sessionsTaken = sessionQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);
  const formClass = myClasses.find((c) => c.isFormTeacher);

  return (
    <div className="os-page">
      <PageHeader title="My profile" subtitle="Your personal and school details." />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError || !profile ? (
        <ErrorMessage message="Failed to load your profile" onRetry={refetch} />
      ) : (
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          <div className="os-grid os-gap-6">
            <KeyValueCard
              title="Personal details"
              rows={[
                ["Full name", `${profile.title ? `${profile.title} ` : ""}${profile.full_name}`],
                ["Name with initials", displayName(profile)],
                ["Gender", profile.gender ? capitalize(profile.gender) : null],
                ["Phone", profile.phone],
              ]}
            />
            <SectionCard title="Subjects I teach">
              {!subjects?.length ? (
                <p className="os-m-0 os-c-tertiary os-text-sm">No subjects assigned yet.</p>
              ) : (
                <div className="os-flex os-gap-2 os-wrap">
                  {subjects.map((s) => (
                    <Pill key={s.id} tone="info" icon={<BookOutlined />}>{s.name}</Pill>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
          <KeyValueCard
            title="School details"
            rows={[
              ["Employee number", profile.employee_number],
              ["Joined", formatDayMonthYear(profile.joined_date)],
              ["Class teacher of", formClass ? classLabel(formClass.grade_name, formClass.class_name) : null],
              ["Classes this year", myClasses.length],
              ["Students taught", studentsTaught],
              ["Attendance sessions taken", sessionsTaken],
            ]}
          />
        </div>
      )}
    </div>
  );
}
