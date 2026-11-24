import { Link } from "react-router";
import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import KeyValueCard from "@/shared/ui/KeyValueCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import { capitalize } from "@/shared/lib/text";
import { useT } from "@/shared/i18n/useT";

export default function StudentProfile() {
  const { t } = useT();
  const { data: p, isLoading, isError, refetch } = useMyStudentProfile();
  return (
    <div className="os-page">
      <PageHeader title={t("nav.myProfile")} subtitle={t("page.profile.sub")} />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError || !p ? (
        <ErrorMessage message={t("student.loadProfileFailed")} onRetry={refetch} />
      ) : (
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          <KeyValueCard
            title={t("profile.personal")}
            rows={[
              [t("profile.fullName"), p.full_name],
              [t("profile.initials"), p.name_with_initials],
              [t("profile.index"), p.index_number],
              [t("profile.gender"), p.gender ? capitalize(p.gender) : null],
              [t("profile.email"), p.email],
              [t("profile.phone"), p.phone],
              [t("profile.whatsapp"), p.whatsapp],
              [t("profile.address"), p.address],
            ]}
          />
          <KeyValueCard
            title={t("profile.school")}
            rows={[
              [t("profile.year"), p.academic_year],
              [t("profile.grade"), p.grade_name],
              [t("profile.class"), p.class_name],
              [t("profile.formTeacher"), p.form_teacher_name],
              [t("profile.house"), p.house_name],
            ]}
            footer={<Link to="/s/guardians" className="os-table__link">{t("profile.guardiansLink")}</Link>}
          />
        </div>
      )}
    </div>
  );
}
