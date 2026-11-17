import type { Dispatch, SetStateAction } from "react";
import type { useCreateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import FormModal from "@/shared/ui/FormModal";
import LevelFormFields from "@/features/curriculum/components/LevelFormFields";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  open: boolean;
  form: LevelForm;
  setForm: Dispatch<SetStateAction<LevelForm>>;
  labelTouched: boolean;
  setLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  createLevel: ReturnType<typeof useCreateLevel>;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateLevelModal({
  open,
  form,
  setForm,
  labelTouched,
  setLabelTouched,
  grades,
  createLevel,
  onClose,
  onCreate,
}: Props) {
  return (
    <FormModal
      open={open}
      title="New level"
      onClose={onClose}
      onSubmit={onCreate}
      isPending={createLevel.isPending}
      submitDisabled={!form.label.trim()}
      submitLabel="Create"
      pendingLabel="Creating…"
      isError={createLevel.isError}
      error={createLevel.error}
      errorFallback="Failed to create level"
    >
      <LevelFormFields
        idPrefix="level"
        form={form}
        setForm={setForm}
        labelTouched={labelTouched}
        onLabelBlur={() => setLabelTouched(true)}
        grades={grades}
      />
    </FormModal>
  );
}
