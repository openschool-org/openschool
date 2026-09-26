import { Add } from "@carbon/icons-react";
import { Button, Tag, InlineNotification } from "@carbon/react";
import type { useLevelTree, useDeleteSelectionGroup, useRemoveGroupSubject } from "@/features/curriculum/queries/useCurriculum";
import type { CurriculumTreeGroup, GroupSubject } from "@/features/curriculum/api/curriculum";
import EmptyState from "@/shared/ui/EmptyState";
import SubjectCard from "@/features/curriculum/components/SubjectCard";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

// Describes a group's pick rule in plain words, an all-mandatory pool is just min = max = pool size.
function ruleLabel(min: number, max: number, pool: number) {
  if (pool > 0 && min === pool && max === pool) {
    return `all ${pool} mandatory`;
  }
  if (min === max) {
    return `pick ${min} of ${pool}`;
  }
  return `pick ${min}–${max} of ${pool}`;
}

// A group asking for more subjects than it offers can never be satisfied, the backend doesn't reject this, so flag it here.
function unsatisfiable(min: number, pool: number) {
  return min > pool;
}

interface Props {
  tree: NonNullable<ReturnType<typeof useLevelTree>["data"]>;
  deleteGroup: ReturnType<typeof useDeleteSelectionGroup>;
  removeSubject: ReturnType<typeof useRemoveGroupSubject>;
  onOpenCreateGroup: () => void;
  onEditGroup: (group: CurriculumTreeGroup) => void;
  onRequestDeleteGroup: (group: CurriculumTreeGroup) => void;
  onAddSubject: (group: CurriculumTreeGroup) => void;
  onRequestRemoveSubject: (group: CurriculumTreeGroup, subject: GroupSubject) => void;
}

export default function GroupsList({
  tree,
  deleteGroup,
  removeSubject,
  onOpenCreateGroup,
  onEditGroup,
  onRequestDeleteGroup,
  onAddSubject,
  onRequestRemoveSubject,
}: Props) {
  return (
    <>
      <MutationErrorNotification
        isError={deleteGroup.isError}
        error={deleteGroup.error}
        title="Could not delete group"
        fallback="The group may have students enrolled through it."
        onClose={() => deleteGroup.reset()} className="os-mb-4"
      />

      <MutationErrorNotification
        isError={removeSubject.isError}
        error={removeSubject.error}
        title="Could not remove subject"
        fallback="Please try again."
        onClose={() => removeSubject.reset()} className="os-mb-4"
      />

      {tree.groups.length === 0 ? (
        <div className="os-section">
          <EmptyState
            title="No selection groups"
            description="Add a group for each decision a student makes at this level - one for compulsory subjects, and one per elective pool."
            action={
              <Button renderIcon={Add} kind="primary" onClick={onOpenCreateGroup}>
                New group
              </Button>
            }
          />
        </div>
      ) : (
        <div className="os-flex os-col os-gap-4">
          {tree.groups.map((g) => {
            const pool = g.subjects.length;
            const broken = unsatisfiable(g.min_select, pool);

            return (
              <div
                key={g.id} className="os-border os-rounded-lg os-overflow-hidden os-bg-layer"
              >
                <div className="os-py-3 os-px-4 os-bg-layer-hover os-border-b os-flex os-items-center os-gap-3"
                >
                  <span className="os-fw-600 os-text-md os-c-primary">{g.label}</span>
                  <Tag type={broken ? "red" : "blue"} size="sm">
                    {ruleLabel(g.min_select, g.max_select, pool)}
                  </Tag>
                  <div className="os-ml-auto os-flex os-gap-1">
                    <Button kind="ghost" size="sm" onClick={() => onEditGroup(g)}>
                      Edit
                    </Button>
                    <Button kind="danger--ghost" size="sm" onClick={() => onRequestDeleteGroup(g)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {broken && (
                  <InlineNotification
                    kind="warning"
                    title="Impossible rule"
                    subtitle={`This group asks for ${g.min_select} subject(s) but only offers ${pool}. No student can satisfy it.`}
                    lowContrast
                    hideCloseButton className="os-max-w-full os-m-0"
                  />
                )}

                <div className="os-p-3">
                  {pool === 0 ? (
                    <p className="os-m-0 os-p-3 os-text-sm os-c-tertiary">
                      No subjects in this group yet.
                    </p>
                  ) : (
                    <div
                      className="os-grid os-grid-auto-260 os-gap-2 os-items-grid-start"
                    >
                      {g.subjects.map((s) => (
                        <SubjectCard key={s.subject_id} subject={s} onRemove={() => onRequestRemoveSubject(g, s)} />
                      ))}
                    </div>
                  )}

                  <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => onAddSubject(g)} style={{ marginTop: "0.5rem" }}>
                    Add subject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
