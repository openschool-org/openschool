import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useStudentEnrollments } from "@/features/students/queries/useEnrollments";
import EnrollmentsTable from "@/features/students/components/EnrollmentsTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentEnrollment() {
  const { t } = useT();
  const profile = useMyStudentProfile();
  const year = useCurrentAcademicYear();
  const enrollments = useStudentEnrollments(profile.data?.id ?? "", year.data?.id ?? "");

  const loading = profile.isLoading || year.isLoading || enrollments.isLoading;
  const failed = profile.isError || year.isError || enrollments.isError;
  return (
    <div className="os-page">
      <PageHeader title={t("nav.subjectEnrolment")} subtitle={t("page.enrolment.sub")} />
      {loading ? (
        <LoadingSpinner />
      ) : failed ? (
        <ErrorMessage message={t("enrol.loadFailed")} onRetry={() => { profile.refetch(); enrollments.refetch(); }} />
      ) : (
      <SectionCard title={t("enrol.title")} flush>
        {enrollments.data?.length ? (
          <EnrollmentsTable rows={enrollments.data} />
        ) : (
          <EmptyState title={t("enrol.emptyTitle")} description={t("enrol.emptyStudent")} />
        )}
      </SectionCard>
      )}
    </div>
  );
}
