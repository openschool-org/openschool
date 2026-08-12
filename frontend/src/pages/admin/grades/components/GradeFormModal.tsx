import { TextInput } from "@carbon/react";
import FormModal from "../../../../components/common/FormModal";

export default function GradeFormModal({
  mode,
  name,
  onNameChange,
  nameTouched,
  onNameBlur,
  onClose,
  onSubmit,
  isPending,
  isError,
  error,
}: {
  mode: "create" | "edit";
  name: string;
  onNameChange: (value: string) => void;
  nameTouched: boolean;
  onNameBlur: () => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <FormModal
      open
      title={mode === "create" ? "Add grade" : "Edit grade"}
      onClose={onClose}
      onSubmit={onSubmit}
      isPending={isPending}
      submitDisabled={!name.trim()}
      isError={isError}
      error={error}
      errorFallback="Failed to save grade"
    >
      <TextInput
        id="grade-name"
        labelText="Name"
        placeholder="e.g. Grade 6"
        helperText={
          mode === "create"
            ? "Added at the end; use the arrows to move it."
            : "Position is changed with the arrows, not here."
        }
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onBlur={onNameBlur}
        invalid={nameTouched && !name.trim()}
        invalidText="Grade name is required."
      />
    </FormModal>
  );
}
