import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useDuplicateLevel } from "../../../../queries/useCurriculum";
import type { useGrades } from "../../../../queries/useGrades";
import type { Level } from "../../../../services/curriculum";
import FormModal from "../../../../components/common/FormModal";
import type { LevelForm } from "../constants";

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
      <p style={{ fontSize: "0.875rem", color: "#525252", marginBottom: "1rem" }}>
        Every selection group and its subjects are copied to the new level. Editing one afterwards does not affect
        the other.
      </p>
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <TextInput
          id="dup-label"
          labelText="New label"
          helperText="Must differ from every existing level."
          value={dupForm.label}
          onChange={(e) => setDupForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setDupLabelTouched(true)}
          invalid={dupLabelTouched && !dupForm.label.trim()}
          invalidText="A label is required."
        />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
          <Select
            id="dup-grade"
            labelText="Grade (optional)"
            value={dupForm.grade_id}
            onChange={(e) => setDupForm((f) => ({ ...f, grade_id: e.target.value }))}
          >
            <SelectItem value="" text="No grade" />
            {grades?.map((g) => (
              <SelectItem key={g.id} value={g.id} text={g.name} />
            ))}
          </Select>
          <NumberInput
            id="dup-sort"
            label="Sort order"
            min={0}
            value={dupForm.sort_order}
            onChange={(_e, { value }) => setDupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
