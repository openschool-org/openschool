import { Descriptions } from "antd";
import { GRADE_MIN, GRADE_MAX, gradeRangeErrors } from "@/features/school/lib/gradeRange";
import NumberField from "@/shared/ui/NumberField";

interface Props {
  gradeFrom: number | "";
  gradeTo: number | "";
  editable: boolean;
  onChange: (field: "grade_from" | "grade_to", value: number | "") => void;
}

// Fixed until the School model has fields to persist them.
const FIXED = [
  { key: "tz", label: "Time zone", children: "Asia/Colombo (UTC+5:30)" },
  { key: "lang", label: "Default language", children: "English" },
  { key: "cal", label: "Academic calendar", children: "January – December" },
  { key: "grading", label: "Grading", children: "Percentage (0–100)" },
];

export default function AcademicSettingsCard({ gradeFrom, gradeTo, editable, onChange }: Props) {
  const { fromOut, toOut, invalid } = gradeRangeErrors(gradeFrom, gradeTo);
  const rangeText = `Must be between ${GRADE_MIN} and ${GRADE_MAX}.`;
  return (
    <div className="os-stack os-gap-5">
      {editable ? (
        <div className="os-settings-grid">
          <NumberField id="grade-from" label="Lowest grade" helperText="The first grade this school runs." min={GRADE_MIN} max={GRADE_MAX} invalid={fromOut} invalidText={rangeText} value={gradeFrom === "" ? null : gradeFrom} onChange={(v) => onChange("grade_from", v ?? "")} />
          <NumberField
            id="grade-to"
            label="Highest grade"
            helperText="The last grade this school runs."
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={invalid}
            invalidText={toOut ? rangeText : "Must be at least the lowest grade."}
            value={gradeTo === "" ? null : gradeTo}
            onChange={(v) => onChange("grade_to", v ?? "")}
          />
        </div>
      ) : (
        <Descriptions
          className="os-facts"
          layout="vertical"
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: "from", label: "Lowest grade", children: gradeFrom === "" ? "-" : `Grade ${gradeFrom}` },
            { key: "to", label: "Highest grade", children: gradeTo === "" ? "-" : `Grade ${gradeTo}` },
          ]}
        />
      )}
      <div className="os-settings-fixed">
        <p className="os-settings-fixed__note">Fixed for now</p>
        <Descriptions className="os-facts" layout="vertical" column={{ xs: 1, sm: 2 }} items={FIXED} />
      </div>
    </div>
  );
}
