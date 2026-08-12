import { TextInput } from "@carbon/react";
import type { useUpdateClass } from "../../../../queries/useClasses";
import FormModal from "../../../../components/common/FormModal";

interface Props {
  open: boolean;
  nameEdit: string;
  onNameEditChange: (name: string) => void;
  updateClass: ReturnType<typeof useUpdateClass>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditClassModal({
  open,
  nameEdit,
  onNameEditChange,
  updateClass,
  onClose,
  onSave,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Edit class"
      onClose={onClose}
      onSubmit={onSave}
      isPending={updateClass.isPending}
      submitDisabled={!nameEdit.trim()}
      isError={updateClass.isError}
      error={updateClass.error}
      errorFallback="Failed to update class"
    >
      <TextInput
        id="class-name-edit"
        labelText="Class Name"
        value={nameEdit}
        maxLength={20}
        onChange={(e) => onNameEditChange(e.target.value)}
      />
    </FormModal>
  );
}
