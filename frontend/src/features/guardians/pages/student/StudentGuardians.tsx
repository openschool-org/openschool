import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import { useGuardiansByStudent } from "@/features/guardians/queries/useGuardians";
import GuardiansTable from "@/features/guardians/components/GuardiansTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentGuardians() {
  const { t } = useT();
  const profile = useMyStudentProfile();
  const guardians = useGuardiansByStudent(profile.data?.id ?? "");

  const loading = profile.isLoading || guardians.isLoading;
  const failed = profile.isError || guardians.isError;
  return (
    <div className="os-page">
      <PageHeader title={t("nav.myGuardians")} subtitle={t("page.guardians.sub")} />
      {loading ? (
        <LoadingSpinner />
      ) : failed ? (
        <ErrorMessage message={t("guardians.loadFailed")} onRetry={() => { profile.refetch(); guardians.refetch(); }} />
      ) : (
      <SectionCard title={t("child.section.guardians")} flush>
        {guardians.data?.length ? (
          <GuardiansTable rows={guardians.data} />
        ) : (
          <EmptyState title={t("guardians.emptyTitle")} description={t("guardians.emptyStudent")} />
        )}
      </SectionCard>
      )}
    </div>
  );
}
