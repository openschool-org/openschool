import FormModal from "@/shared/ui/FormModal";
import TextField from "@/shared/ui/TextField";

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
      <TextField
        id="grade-name"
        label="Name"
        placeholder="e.g. Grade 6"
        helperText={
          mode === "create"
            ? "Added at the end; use the arrows to move it."
            : "Position is changed with the arrows, not here."
        }
        value={name}
        onChange={onNameChange}
        onBlur={onNameBlur}
        invalid={nameTouched && !name.trim()}
        invalidText="Grade name is required."
      />
    </FormModal>
  );
}
