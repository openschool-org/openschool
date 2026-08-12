import type { Dispatch, SetStateAction } from "react";
import { TextInput, NumberInput } from "@carbon/react";
import type { useCreateSelectionGroup, useUpdateSelectionGroup } from "../../../../queries/useCurriculum";
import FormModal from "../../../../components/common/FormModal";

export interface GroupForm {
  label: string;
  min_select: number;
  max_select: number;
  sort_order: number;
}

interface Props {
  groupModal: "create" | "edit" | null;
  groupForm: GroupForm;
  setGroupForm: Dispatch<SetStateAction<GroupForm>>;
  createGroup: ReturnType<typeof useCreateSelectionGroup>;
  updateGroup: ReturnType<typeof useUpdateSelectionGroup>;
  onClose: () => void;
  onSave: () => void;
}

export default function GroupFormModal({
  groupModal,
  groupForm,
  setGroupForm,
  createGroup,
  updateGroup,
  onClose,
  onSave,
}: Props) {
  const groupFormValid = groupForm.label.trim() && groupForm.max_select >= groupForm.min_select;

  return (
    <FormModal
      open={!!groupModal}
      title={groupModal === "create" ? "New selection group" : "Edit group"}
      onClose={onClose}
      onSubmit={onSave}
      isPending={createGroup.isPending || updateGroup.isPending}
      submitDisabled={!groupFormValid}
      isError={createGroup.isError || updateGroup.isError}
      error={createGroup.error ?? updateGroup.error}
      errorFallback="Failed to save group"
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="group-label"
          labelText="Label"
          placeholder="e.g. Compulsory, or Basket 1"
          value={groupForm.label}
          onChange={(e) => setGroupForm((f) => ({ ...f, label: e.target.value }))}
        />
        <NumberInput
          id="group-min"
          label="Minimum subjects"
          min={0}
          value={groupForm.min_select}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, min_select: Number(value) || 0 }))}
        />
        <NumberInput
          id="group-max"
          label="Maximum subjects"
          min={0}
          invalid={groupForm.max_select < groupForm.min_select}
          invalidText="Maximum must be greater than or equal to minimum."
          value={groupForm.max_select}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, max_select: Number(value) || 0 }))}
        />
        <NumberInput
          id="group-sort"
          label="Sort order"
          min={0}
          value={groupForm.sort_order}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
        />
      </div>
    </FormModal>
  );
}
