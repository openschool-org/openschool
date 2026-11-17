import { Link } from "react-router";
import { Alert } from "antd";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";
import { usePromotionPlan } from "@/features/academics/hooks/usePromotionPlan";
import PromotionYearPicker from "@/features/academics/components/PromotionYearPicker";
import { PromotionFooter, PromotionGroups } from "@/features/academics/components/PromotionResults";

export default function Promotion() {
  const plan = usePromotionPlan();
  const { commit } = plan;
  const noTargetYear = !plan.yearsLoading && plan.otherYears.length === 0;
  const assigned = commit.data?.assigned ?? 0;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Academic year promotion</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Move students to their next grade and class for a new academic year.
            <InfoTip>Nothing changes for the rest of the school until you set that year as current.</InfoTip>
          </div>
        </div>
      </div>

      {noTargetYear && (
        <>
          <Alert type="info" showIcon className="os-mb-2" title="No other academic year to promote into" description="Create the new academic year (and its classes) first, then come back here." />
          <div className="os-mb-6">
            <Link to="/academic-years" className="os-text-sm">
              Go to Academic Years →
            </Link>
          </div>
        </>
      )}

      <PromotionYearPicker plan={plan} />

      {plan.preview.isError && (
        <div className="os-mb-6">
          <ErrorMessage message="Could not load the promotion preview." onRetry={plan.preview.refetch} />
        </div>
      )}
      <MutationErrorNotification
        isError={commit.isError}
        error={commit.error}
        title="Could not save assignments"
        fallback="Please try again."
        onClose={() => commit.reset()} className="os-mb-6"
      />
      {commit.isSuccess && (
        <Alert
          type="success"
          showIcon
          closable
          onClose={() => commit.reset()}
          className="os-mb-6"
          title="Assignments saved"
          description={`${assigned} student${assigned === 1 ? "" : "s"} assigned in the target year. Set it as current from Academic Years when you're ready to publish.`}
        />
      )}

      <PromotionGroups plan={plan} />
      <PromotionFooter plan={plan} />
    </div>
  );
}
