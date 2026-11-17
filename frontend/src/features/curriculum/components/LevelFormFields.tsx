import type { Dispatch, SetStateAction } from "react";
import type { useGrades } from "@/features/academics/queries/useGrades";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  idPrefix: string;
  form: LevelForm;
  setForm: Dispatch<SetStateAction<LevelForm>>;
  labelTouched: boolean;
  onLabelBlur: () => void;
  grades: ReturnType<typeof useGrades>["data"];
  // Edit puts grade and sort order on one row and drops the hints.
  compact?: boolean;
}

export default function LevelFormFields({ idPrefix, form, setForm, labelTouched, onLabelBlur, grades, compact }: Props) {
  const grade = (
    <SelectField
      id={`${idPrefix}-grade`}
      label="Grade (optional)"
      helperText={compact ? undefined : "Link this level to a grade, or leave unset for tracks that span grades."}
      value={form.grade_id}
      onChange={(v) => setForm((f) => ({ ...f, grade_id: v }))}
      options={[{ value: "", label: "No grade" }, ...(grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
    />
  );
  const sort = (
    <NumberField
      id={`${idPrefix}-sort`}
      label="Sort order"
      min={0}
      value={form.sort_order}
      onChange={(value) => setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
    />
  );

  return (
    <div className={compact ? "os-grid os-gap-5" : "os-grid os-gap-4"}>
      <TextField
        id={`${idPrefix}-label`}
        label="Label"
        placeholder={compact ? undefined : "e.g. Grade 10, or Physical Science"}
        value={form.label}
        onChange={(v) => setForm((f) => ({ ...f, label: v }))}
        onBlur={onLabelBlur}
        invalid={labelTouched && !form.label.trim()}
        invalidText="A label is required."
      />
      {compact ? (
        <div className="os-grid os-grid-cols-2-1 os-gap-4">
          {grade}
          {sort}
        </div>
      ) : (
        <>
          {grade}
          {sort}
        </>
      )}
    </div>
  );
}
