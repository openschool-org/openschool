// This file renders the StudentEnrollment page, showing the list of academic subjects currently enrolled by the student.

import { useMyStudentProfile } from "../../queries/useStudentSelf";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useStudentEnrollments } from "../../queries/useEnrollments";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function StudentEnrollment() {
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useMyStudentProfile();
  const { data: currentYear, isLoading: yearLoading, isError: yearError } = useCurrentAcademicYear();
  const { data: enrollments, isLoading: enrollmentsLoading, isError: enrollmentsError, refetch: refetchEnrollments } = useStudentEnrollments(
    profile?.id ?? "",
    currentYear?.id ?? ""
  );

  const isLoading = profileLoading || yearLoading || enrollmentsLoading;
  const isError = profileError || yearError || enrollmentsError;

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load subject enrollments" onRetry={() => { refetchProfile(); refetchEnrollments(); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Enrolled Subjects</h2>
        </div>
        <div className="os-section__body" style={{ padding: 0 }}>
          {!enrollments || enrollments.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <EmptyState
                title="No enrolled subjects"
                description="Your enrolled subjects will show up here once configured for the current academic year."
              />
            </div>
          ) : (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Subject Code</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.subject_id}>
                    <td style={{ fontWeight: 500 }}>{e.subject_name}</td>
                    <td className="os-table__mono">{e.subject_code}</td>
                    <td>{e.subject_type ? e.subject_type[0].toUpperCase() + e.subject_type.slice(1) : "Core"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
