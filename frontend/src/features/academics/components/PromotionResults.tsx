import { Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { SkeletonText } from "@/shared/ui/Skeleton";
import EmptyState from "@/shared/ui/EmptyState";
import PromotionGroup from "@/features/academics/components/PromotionGroup";
import type { PromotionPlan } from "@/features/academics/hooks/usePromotionPlan";

// The grade groups to assign, or the reason there is nothing to show yet.
export function PromotionGroups({ plan }: { plan: PromotionPlan }) {
  if (!plan.targetYearId) {
    return (
      <div className="os-section">
        <EmptyState title="Pick a target year" description="Choose the academic year you're promoting students into." />
      </div>
    );
  }
  if (plan.preview.isLoading) {
    return (
      <div className="os-section os-p-6">
        <SkeletonText width="40%" />
      </div>
    );
  }
  if (plan.groups.length === 0) {
    return (
      <div className="os-section">
        <EmptyState title="No active students" description="No actively-enrolled students found for the source year." />
      </div>
    );
  }
  return (
    <>
      {plan.groups.map((group) => (
        <PromotionGroup
          key={group.gradeId}
          gradeId={group.gradeId}
          isGraduating={group.gradeId === "graduating"}
          gradeName={group.gradeName}
          rows={group.rows}
          targetClasses={plan.targetClasses.filter((c) => c.grade_id === group.gradeId)}
          assignments={plan.assignments}
          onAssign={plan.assign}
          onBulkAssign={plan.bulkAssign}
          selected={plan.selected}
          onToggleSelected={plan.toggleSelected}
          rankByMarks={plan.rankByMarks}
        />
      ))}
    </>
  );
}

// Unassigned warning and the save button, shown once there are groups.
export function PromotionFooter({ plan }: { plan: PromotionPlan }) {
  if (plan.groups.length === 0) return null;
  const { unassignedCount, commit } = plan;
  return (
    <div className="os-flex os-items-center os-gap-4 os-py-6 os-px-0">
      {unassignedCount > 0 && (
        <span className="os-text-sm os-c-warning-text">
          {unassignedCount} student{unassignedCount !== 1 ? "s" : ""} without a target class - they'll be
          skipped until assigned.
        </span>
      )}
      <div className="os-flex-1" />
      <Button type="primary" icon={<ReloadOutlined />} onClick={plan.save} disabled={!plan.readyToCommit} loading={commit.isPending}>
        {commit.isPending ? "Saving…" : "Save assignments"}
      </Button>
    </div>
  );
}
