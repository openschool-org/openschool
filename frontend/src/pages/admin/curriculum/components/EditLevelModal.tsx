import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useUpdateLevel } from "../../../../queries/useCurriculum";
import type { useGrades } from "../../../../queries/useGrades";
import type { Level } from "../../../../services/curriculum";
import FormModal from "../../../../components/common/FormModal";
import type { LevelForm } from "../constants";

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
      submitLabel="Save Changes"
      isError={updateLevel.isError}
      error={updateLevel.error}
      errorFallback="Failed to update level"
    >
      <p style={{ fontSize: "0.875rem", color: "#525252", marginBottom: "1rem" }}>
        Renaming a level leaves its selection groups and student choices untouched — only the label, grade link,
        and ordering change.
      </p>
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <TextInput
          id="edit-label"
          labelText="Label"
          value={editForm.label}
          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setEditLabelTouched(true)}
          invalid={editLabelTouched && !editForm.label.trim()}
          invalidText="A label is required."
        />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
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
