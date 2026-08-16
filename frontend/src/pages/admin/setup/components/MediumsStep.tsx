import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox, TextInput } from "@carbon/react";
import { Language, Add } from "@carbon/icons-react";
import StepShell from "./StepShell";
import RepeatableRow from "./RepeatableRow";
import { SUGGESTED_MEDIUMS } from "../constants";

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
      icon={Language}
      title="Mediums"
      subtitle="Optional - languages of instruction. Set these first so the next step can tag each section with one."
    >
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
        {SUGGESTED_MEDIUMS.map((m) => (
          <Checkbox
            key={m}
            id={`medium-${m}`}
            labelText={m}
            checked={!!mediumChecks[m]}
            onChange={(_e, { checked }) => setMediumChecks((prev) => ({ ...prev, [m]: checked }))}
          />
        ))}
      </div>
      {customMediums.map((m, i) => (
        <RepeatableRow key={i} onRemove={() => setCustomMediums((ms) => ms.filter((_, idx) => idx !== i))}>
          <TextInput
            id={`custom-medium-${i}`}
            labelText="Medium"
            size="md"
            value={m}
            onChange={(e) => setCustomMediums((ms) => ms.map((row, idx) => (idx === i ? e.target.value : row)))}
          />
        </RepeatableRow>
      ))}
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCustomMediums((ms) => [...ms, ""])}>
        Add another medium
      </Button>
    </StepShell>
  );
}
