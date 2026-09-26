import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import { useGuardiansByStudent } from "@/features/guardians/queries/useGuardians";
import GuardiansTable from "@/features/guardians/components/GuardiansTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentGuardians() {
  const { t } = useT();
  const profile = useMyStudentProfile();
  const guardians = useGuardiansByStudent(profile.data?.id ?? "");

  if (profile.isLoading || guardians.isLoading) return <LoadingSpinner />;
  if (profile.isError || guardians.isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("guardians.loadFailed")} onRetry={() => { profile.refetch(); guardians.refetch(); }} />
      </div>
    );
  }
  return (
    <div className="os-p-8">
      <SectionCard title={t("guardians.mine")} flush>
        {guardians.data?.length ? (
          <GuardiansTable rows={guardians.data} />
        ) : (
          <EmptyState title={t("guardians.emptyTitle")} description={t("guardians.emptyStudent")} />
        )}
      </SectionCard>
    </div>
  );
}
