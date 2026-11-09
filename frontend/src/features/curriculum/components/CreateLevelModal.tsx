import type { Dispatch, SetStateAction } from "react";
import type { useCreateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import FormModal from "@/shared/ui/FormModal";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
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
      <div className="os-grid os-gap-4">
        <TextField
          id="level-label"
          label="Label"
          placeholder="e.g. Grade 10, or Physical Science"
          value={form.label}
          onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          onBlur={() => setLabelTouched(true)}
          invalid={labelTouched && !form.label.trim()}
          invalidText="A label is required."
        />
        <SelectField
          id="level-grade"
          label="Grade (optional)"
          helperText="Link this level to a grade, or leave unset for tracks that span grades."
          value={form.grade_id}
          onChange={(v) => setForm((f) => ({ ...f, grade_id: v }))}
          options={[{ value: "", label: "No grade" }, ...(grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
        />
        <NumberField
          id="level-sort"
          label="Sort order"
          min={0}
          value={form.sort_order}
          onChange={(value) => setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
        />
      </div>
    </FormModal>
  );
}
