import type { Dispatch, SetStateAction } from "react";
import type { useUpdateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import LevelFormFields from "@/features/curriculum/components/LevelFormFields";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  toEdit: Level | null;
  editForm: LevelForm;
  setEditForm: Dispatch<SetStateAction<LevelForm>>;
  editLabelTouched: boolean;
  setEditLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  updateLevel: ReturnType<typeof useUpdateLevel>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditLevelModal({
  toEdit,
  editForm,
  setEditForm,
  editLabelTouched,
  setEditLabelTouched,
  grades,
  updateLevel,
  onClose,
  onSave,
}: Props) {
  return (
    <FormModal
      open={!!toEdit}
      title={`Edit ${toEdit?.label ?? ""}`}
      size="md"
      onClose={onClose}
      onSubmit={onSave}
      isPending={updateLevel.isPending}
      submitDisabled={!editForm.label.trim()}
      submitLabel="Save changes"
      isError={updateLevel.isError}
      error={updateLevel.error}
      errorFallback="Failed to update level"
    >
      <p className="os-text-md os-c-secondary os-mb-4">
        Renaming a level leaves its selection groups and student choices untouched - only the label, grade link,
        and ordering change.
      </p>
      <LevelFormFields
        idPrefix="edit"
        form={editForm}
        setForm={setEditForm}
        labelTouched={editLabelTouched}
        onLabelBlur={() => setEditLabelTouched(true)}
        grades={grades}
        compact
      />
    </FormModal>
  );
}
