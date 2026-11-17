import type { Blocker } from "react-router";
import type { CurriculumTreeGroup, GroupSubject } from "@/features/curriculum/api/curriculum";
import type { useDeleteSelectionGroup } from "@/features/curriculum/queries/useCurriculum";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";

interface Props {
  toRemoveSubject: { group: CurriculumTreeGroup; subject: GroupSubject } | null;
  onCloseRemoveSubject: () => void;
  onRemoveSubject: () => void;
  toDeleteGroup: CurriculumTreeGroup | null;
  deleteGroup: ReturnType<typeof useDeleteSelectionGroup>;
  onCloseDeleteGroup: () => void;
  blocker: Blocker;
}

// Confirmations on the level page: remove a staged subject, delete a group, leave with unsaved changes.
export default function LevelDetailConfirms({ toRemoveSubject, onCloseRemoveSubject, onRemoveSubject, toDeleteGroup, deleteGroup, onCloseDeleteGroup, blocker }: Props) {
  return (
    <>
      <ConfirmActionModal
        open={!!toRemoveSubject}
        title="Remove subject from group"
        description={
          <>
            Remove <strong>{toRemoveSubject?.subject.subject_name}</strong> from{" "}
            <strong>{toRemoveSubject?.group.label}</strong>? The subject stays in
            the catalogue.
          </>
        }
        confirmLabel="Remove from group"
        danger
        onClose={onCloseRemoveSubject}
        onConfirm={onRemoveSubject}
      />

      <ConfirmDeleteModal
        open={!!toDeleteGroup}
        title="Delete selection group"
        description={
          <>
            Delete <strong>{toDeleteGroup?.label}</strong>? Its subjects stay in
            the catalogue.
          </>
        }
        subject="Selection group"
        mutation={deleteGroup}
        onClose={onCloseDeleteGroup}
        onConfirm={() => toDeleteGroup && deleteGroup.mutate(toDeleteGroup.id)}
      />

      <ConfirmActionModal
        open={blocker.state === "blocked"}
        title="Leave with unsaved subject changes?"
        description="Your staged subject changes will be lost if you leave this page before saving them."
        confirmLabel="Leave page"
        danger
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
