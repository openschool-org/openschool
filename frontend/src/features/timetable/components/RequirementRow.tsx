import NumberField from "@/shared/ui/NumberField";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { SubjectPeriodRequirement } from "@/features/timetable/api/subjectPeriodRequirement";
import type { RequirementValues } from "@/features/timetable/lib/requirements";

interface Props {
  subjectId: string;
  subjectName: string;
  requirement: SubjectPeriodRequirement | undefined;
  removeDisabled: boolean;
  onChange: (v: RequirementValues) => void;
  onClear: (r: SubjectPeriodRequirement) => void;
}

export default function RequirementRow({ subjectId, subjectName, requirement, removeDisabled, onChange, onClear }: Props) {
  const current: RequirementValues = {
    periods: requirement?.periods_per_week ?? 0,
    labPeriods: requirement?.lab_periods_per_week ?? 0,
    doubleBlocks: requirement?.double_period_blocks ?? 0,
  };
  const maxBlocks = Math.floor(current.periods / 2);
  const change = (patch: Partial<RequirementValues>) => onChange({ ...current, ...patch });

  return (
    <tr>
      <td className="os-fw-500">{subjectName}</td>
      <td>
        <NumberField id={`periods-${subjectId}`} label="Periods per week" hideLabel size="small" min={0} max={20} value={current.periods} onChange={(v) => change({ periods: v ?? 0 })} />
      </td>
      <td>
        <NumberField
          id={`lab-periods-${subjectId}`}
          label="Lab periods per week"
          hideLabel
          size="small"
          min={0}
          max={current.periods}
          value={current.labPeriods}
          disabled={current.periods === 0}
          onChange={(v) => change({ labPeriods: v ?? 0 })}
        />
      </td>
      <td>
        <NumberField
          id={`double-blocks-${subjectId}`}
          label="Double blocks per week"
          hideLabel
          size="small"
          min={0}
          max={maxBlocks}
          value={current.doubleBlocks}
          disabled={maxBlocks === 0}
          helperText={maxBlocks > 0 ? `up to ${maxBlocks}` : undefined}
          onChange={(v) => change({ doubleBlocks: v ?? 0 })}
        />
      </td>
      <td>
        {/* Clearing removes the row (unset), distinct from setting 0 periods (checked by the validator as zero). */}
        <RemoveIconButton label="Clear requirement" disabled={!requirement || removeDisabled} onClick={() => requirement && onClear(requirement)} />
      </td>
    </tr>
  );
}
