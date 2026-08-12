import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useCreateLevel } from "../../../../queries/useCurriculum";
import type { useGrades } from "../../../../queries/useGrades";
import FormModal from "../../../../components/common/FormModal";
import type { LevelForm } from "../constants";

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
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="level-label"
          labelText="Label"
          placeholder="e.g. Grade 10, or Physical Science"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setLabelTouched(true)}
          invalid={labelTouched && !form.label.trim()}
          invalidText="A label is required."
        />
        <Select
          id="level-grade"
          labelText="Grade (optional)"
          helperText="Link this level to a grade, or leave unset for tracks that span grades."
          value={form.grade_id}
          onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value }))}
        >
          <SelectItem value="" text="No grade" />
          {grades?.map((g) => (
            <SelectItem key={g.id} value={g.id} text={g.name} />
          ))}
        </Select>
        <NumberInput
          id="level-sort"
          label="Sort order"
          min={0}
          value={form.sort_order}
          onChange={(_e, { value }) => setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
        />
      </div>
    </FormModal>
  );
}
