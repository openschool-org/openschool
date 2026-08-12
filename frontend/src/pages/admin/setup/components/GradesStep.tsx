import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "@carbon/react";
import { Education } from "@carbon/icons-react";
import StepShell from "./StepShell";

interface Props {
  gradeRangeStart: number;
  gradeRangeEnd: number;
  selectedGrades: Set<number>;
  setSelectedGrades: Dispatch<SetStateAction<Set<number>>>;
}

export default function GradesStep({
  gradeRangeStart,
  gradeRangeEnd,
  selectedGrades,
  setSelectedGrades,
}: Props) {
  return (
    <StepShell icon={Education} title="Grades" subtitle="Pre-selected from the range you set. Uncheck any that don't apply.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {Array.from({ length: gradeRangeEnd - gradeRangeStart + 1 }, (_, i) => i + gradeRangeStart).map((n) => (
          <Checkbox
            key={n}
            id={`grade-${n}`}
            labelText={`Grade ${n}`}
            checked={selectedGrades.has(n)}
            onChange={(_e, { checked }) =>
              setSelectedGrades((prev) => {
                const next = new Set(prev);
                if (checked) next.add(n);
                else next.delete(n);
                return next;
              })
            }
          />
        ))}
      </div>
    </StepShell>
  );
}
