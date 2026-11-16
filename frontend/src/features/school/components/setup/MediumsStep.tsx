import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox } from "antd";
import { GlobalOutlined, PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import StepShell from "@/features/school/components/setup/StepShell";
import RepeatableRow from "@/features/school/components/setup/RepeatableRow";
import { SUGGESTED_MEDIUMS } from "@/features/school/setupConstants";

interface Props {
  mediumChecks: Record<string, boolean>;
  setMediumChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  customMediums: string[];
  setCustomMediums: Dispatch<SetStateAction<string[]>>;
}

export default function MediumsStep({
  mediumChecks,
  setMediumChecks,
  customMediums,
  setCustomMediums,
}: Props) {
  return (
    <StepShell
      icon={GlobalOutlined}
      title="Mediums"
      subtitle="Optional - languages of instruction. Set these first so the next step can tag each section with one."
    >
      <div className="os-flex os-gap-6 os-mb-4">
        {SUGGESTED_MEDIUMS.map((m) => (
          <Checkbox
            key={m}
            id={`medium-${m}`}
            checked={!!mediumChecks[m]}
            onChange={(e) => setMediumChecks((prev) => ({ ...prev, [m]: e.target.checked }))}
          >
            {m}
          </Checkbox>
        ))}
      </div>
      {customMediums.map((m, i) => (
        <RepeatableRow key={i} onRemove={() => setCustomMediums((ms) => ms.filter((_, idx) => idx !== i))}>
          <TextField
            id={`custom-medium-${i}`}
            label="Medium"
            value={m}
            onChange={(value) => setCustomMediums((ms) => ms.map((row, idx) => (idx === i ? value : row)))}
          />
        </RepeatableRow>
      ))}
      <Button type="text" icon={<PlusOutlined />} onClick={() => setCustomMediums((ms) => [...ms, ""])}>
        Add another medium
      </Button>
    </StepShell>
  );
}
