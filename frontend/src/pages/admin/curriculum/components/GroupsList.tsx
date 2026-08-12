import { Add } from "@carbon/icons-react";
import { Button, Tag, InlineNotification } from "@carbon/react";
import type { useLevelTree, useDeleteSelectionGroup, useRemoveGroupSubject } from "../../../../queries/useCurriculum";
import type { CurriculumTreeGroup, GroupSubject } from "../../../../services/curriculum";
import { getErrorMessage as apiError } from "../../../../lib/errorMessage";
import EmptyState from "../../../../components/common/EmptyState";
import SubjectCard from "./SubjectCard";

// Describes a group's pick rule in plain words. An all-mandatory pool is just
// min = max = pool size, so it needs no special flag anywhere.
function ruleLabel(min: number, max: number, pool: number) {
  if (pool > 0 && min === pool && max === pool) {
    return `all ${pool} mandatory`;
  }
  if (min === max) {
    return `pick ${min} of ${pool}`;
  }
  return `pick ${min}–${max} of ${pool}`;
}

// A group asking for more subjects than it offers can never be satisfied. The
// backend does not reject this (the pool changes independently of the rule), so
// surface it here while the admin is still editing.
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
      {deleteGroup.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete group"
          subtitle={apiError(deleteGroup.error, "The group may have students enrolled through it.")}
          lowContrast
          onClose={() => deleteGroup.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {removeSubject.isError && (
        <InlineNotification
          kind="error"
          title="Could not remove subject"
          subtitle={apiError(removeSubject.error, "Please try again.")}
          lowContrast
          onClose={() => removeSubject.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {tree.groups.length === 0 ? (
        <div className="os-section">
          <EmptyState
            title="No selection groups"
            description="Add a group for each decision a student makes at this level - one for compulsory subjects, and one per elective pool."
            action={
              <Button renderIcon={Add} kind="primary" onClick={onOpenCreateGroup}>
                New Group
              </Button>
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {tree.groups.map((g) => {
            const pool = g.subjects.length;
            const broken = unsatisfiable(g.min_select, pool);

            return (
              <div
                key={g.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#f4f4f4",
                    borderBottom: "1px solid #e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{g.label}</span>
                  <Tag type={broken ? "red" : "blue"} size="sm">
                    {ruleLabel(g.min_select, g.max_select, pool)}
                  </Tag>
                  <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem" }}>
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
                    hideCloseButton
                    style={{ maxWidth: "100%", margin: 0 }}
                  />
                )}

                <div style={{ padding: "0.75rem" }}>
                  {pool === 0 ? (
                    <p style={{ margin: 0, padding: "0.75rem", fontSize: "0.8125rem", color: "#8d8d8d" }}>
                      No subjects in this group yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "0.5rem",
                        // let each card hug its own content: stretching makes
                        // cards without a tag look bottom-padded
                        alignItems: "start",
                      }}
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
