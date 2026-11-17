import { Checkbox } from "antd";
import SelectField from "@/shared/ui/SelectField";
import type { PromotionPlan } from "@/features/academics/hooks/usePromotionPlan";

// Source year, target year and the optional marks ranking for the promotion page.
export default function PromotionYearPicker({ plan }: { plan: PromotionPlan }) {
  const { currentYear, years, otherYears, terms } = plan;
  return (
    <div className="os-section os-mb-6">
      <div className="os-section__body os-grid os-grid-form-3-auto os-gap-4 os-items-grid-end os-py-5 os-px-6">
        <SelectField
          id="source-year"
          label="Source year"
          value={plan.sourceYearId}
          onChange={plan.changeSource}
          options={[{ value: "", label: currentYear ? `${currentYear.label} (current)` : "Select…" }, ...years.map((y) => ({ value: y.id, label: y.label + (y.is_current ? " (current)" : "") }))]}
        />
        <SelectField id="target-year" label="Target year" placeholder="Select…" value={plan.targetYearId} onChange={plan.setTargetYearId} options={otherYears.map((y) => ({ value: y.id, label: y.label }))} />
        <SelectField id="rank-term" label="Sort by marks (optional)" value={plan.termId} onChange={plan.setTermId} options={[{ value: "", label: "None" }, ...terms.map((t) => ({ value: t.id, label: t.name }))]} />
        <Checkbox id="rank-by-marks" checked={plan.rankByMarks} disabled={!plan.termId} onChange={(e) => plan.setRankByMarks(e.target.checked)}>
          Sort by total marks
        </Checkbox>
      </div>
    </div>
  );
}
