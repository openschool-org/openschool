import { NumberInput, Select, SelectItem } from "@carbon/react";
import { GRADE_MIN, GRADE_MAX, gradeRangeErrors } from "@/features/school/lib/gradeRange";

interface Props {
  gradeFrom: number | "";
  gradeTo: number | "";
  editable: boolean;
  onChange: (field: "grade_from" | "grade_to", value: number | "") => void;
}

export default function AcademicSettingsCard({ gradeFrom, gradeTo, editable, onChange }: Props) {
  const { fromOut, toOut, invalid } = gradeRangeErrors(gradeFrom, gradeTo);
  const rangeText = `Must be between ${GRADE_MIN} and ${GRADE_MAX}.`;
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Academic settings</h2>
      </div>
      <div className="os-section__body">
        <div className="os-grid os-grid-cols-2 os-gap-5 os-mb-5">
          <NumberInput
            id="grade-from"
            label="Lowest grade"
            helperText="The first grade this school runs (1–13)."
            min={GRADE_MIN}
            max={GRADE_MAX}
            disabled={!editable}
            invalid={fromOut}
            invalidText={rangeText}
            value={gradeFrom}
            onChange={(_e, { value }) => onChange("grade_from", value === "" ? "" : Number(value))}
          />
          <NumberInput
            id="grade-to"
            label="Highest grade"
            helperText="The last grade this school runs (1–13)."
            min={GRADE_MIN}
            max={GRADE_MAX}
            disabled={!editable}
            invalid={invalid}
            invalidText={toOut ? rangeText : "Highest grade must be greater than or equal to lowest grade."}
            value={gradeTo}
            onChange={(_e, { value }) => onChange("grade_to", value === "" ? "" : Number(value))}
          />
        </div>
        {/* Disabled until the School model has fields to persist these. */}
        <div className="os-grid os-grid-cols-2 os-gap-5">
          <Select id="timezone" labelText="Time zone" defaultValue="asia_colombo" disabled helperText="Not yet configurable">
            <SelectItem value="asia_colombo" text="Asia/Colombo (UTC+5:30)" />
            <SelectItem value="utc" text="UTC" />
          </Select>
          <Select id="language" labelText="Default language" defaultValue="english" disabled helperText="Not yet configurable">
            <SelectItem value="english" text="English" />
            <SelectItem value="sinhala" text="Sinhala" />
            <SelectItem value="tamil" text="Tamil" />
          </Select>
          <Select id="calendar" labelText="Academic calendar" defaultValue="jan_dec" disabled helperText="Not yet configurable">
            <SelectItem value="jan_dec" text="January - December" />
            <SelectItem value="sep_aug" text="September - August" />
          </Select>
          <Select id="grading" labelText="Grading system" defaultValue="percentage" disabled helperText="Not yet configurable">
            <SelectItem value="percentage" text="Percentage (0-100)" />
            <SelectItem value="grade" text="Grade (A-F)" />
          </Select>
        </div>
      </div>
    </div>
  );
}
