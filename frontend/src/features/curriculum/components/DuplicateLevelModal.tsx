import type { Dispatch, SetStateAction } from "react";
import type { useDuplicateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  toDuplicate: Level | null;
  dupForm: LevelForm;
  setDupForm: Dispatch<SetStateAction<LevelForm>>;
  dupLabelTouched: boolean;
  setDupLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  duplicateLevel: ReturnType<typeof useDuplicateLevel>;
  onClose: () => void;
  onDuplicate: () => void;
}

export default function DuplicateLevelModal({
  toDuplicate,
  dupForm,
  setDupForm,
  dupLabelTouched,
  setDupLabelTouched,
  grades,
  duplicateLevel,
  onClose,
  onDuplicate,
}: Props) {
  return (
    <FormModal
      open={!!toDuplicate}
      title={`Duplicate ${toDuplicate?.label ?? ""}`}
      size="md"
      onClose={onClose}
      onSubmit={onDuplicate}
      isPending={duplicateLevel.isPending}
      submitDisabled={!dupForm.label.trim()}
      submitLabel="Duplicate"
      pendingLabel="Duplicating…"
      isError={duplicateLevel.isError}
      error={duplicateLevel.error}
      errorFallback="Failed to duplicate level"
    >
      <p className="os-text-md os-c-secondary os-mb-4">
        Every selection group and its subjects are copied to the new level. Editing one afterwards does not affect
        the other.
      </p>
      <div className="os-grid os-gap-5">
        <TextField
          id="dup-label"
          label="New label"
          helperText="Must differ from every existing level."
          value={dupForm.label}
          onChange={(v) => setDupForm((f) => ({ ...f, label: v }))}
          onBlur={() => setDupLabelTouched(true)}
          invalid={dupLabelTouched && !dupForm.label.trim()}
          invalidText="A label is required."
        />
        <div className="os-grid os-grid-cols-2-1 os-gap-4">
          <SelectField
            id="dup-grade"
            label="Grade (optional)"
            value={dupForm.grade_id}
            onChange={(v) => setDupForm((f) => ({ ...f, grade_id: v }))}
            options={[{ value: "", label: "No grade" }, ...(grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
          />
          <NumberField
            id="dup-sort"
            label="Sort order"
            min={0}
            value={dupForm.sort_order}
            onChange={(value) => setDupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
