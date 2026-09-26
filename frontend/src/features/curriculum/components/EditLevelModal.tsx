import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useUpdateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
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
      <div className="os-grid os-gap-5">
        <TextInput
          id="edit-label"
          labelText="Label"
          value={editForm.label}
          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setEditLabelTouched(true)}
          invalid={editLabelTouched && !editForm.label.trim()}
          invalidText="A label is required."
        />
        <div className="os-grid os-grid-cols-2-1 os-gap-4">
          <Select
            id="edit-grade"
            labelText="Grade (optional)"
            value={editForm.grade_id}
            onChange={(e) => setEditForm((f) => ({ ...f, grade_id: e.target.value }))}
          >
            <SelectItem value="" text="No grade" />
            {grades?.map((g) => (
              <SelectItem key={g.id} value={g.id} text={g.name} />
            ))}
          </Select>
          <NumberInput
            id="edit-sort"
            label="Sort order"
            min={0}
            value={editForm.sort_order}
            onChange={(_e, { value }) => setEditForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
