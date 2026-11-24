import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "antd";
import { GRADE_BANDS } from "@/features/school/setupConstants";

interface Props {
  gradeRangeStart: number;
  gradeRangeEnd: number;
  selectedGrades: Set<number>;
  setSelectedGrades: Dispatch<SetStateAction<Set<number>>>;
}

// Grades 12 and 13 share the A/L streams, so they are always selected together.
const linked = (grade: number) => (grade === 12 || grade === 13 ? [12, 13] : [grade]);

export default function GradesStep({ gradeRangeStart, gradeRangeEnd, selectedGrades, setSelectedGrades }: Props) {
  const inRange = (grade: number) => grade >= gradeRangeStart && grade <= gradeRangeEnd;
  const toggle = (grades: number[], checked: boolean) =>
    setSelectedGrades((prev) => {
      const next = new Set(prev);
      for (const grade of grades.flatMap(linked).filter(inRange)) {
        if (checked) next.add(grade);
        else next.delete(grade);
      }
      return next;
    });

  const bands = GRADE_BANDS.map((band) => ({
    ...band,
    grades: Array.from({ length: band.to - band.from + 1 }, (_, i) => band.from + i).filter(inRange),
  })).filter((band) => band.grades.length > 0);

  return (
    <div>
      <div className="os-setup-bands">
        {bands.map((band) => {
          const chosen = band.grades.filter((grade) => selectedGrades.has(grade)).length;
          return (
            <fieldset key={band.key} className="os-setup-band">
              <legend className="os-sr-only">{band.label}</legend>
              <div className="os-setup-band__head">
                <Checkbox
                  id={`band-${band.key}`}
                  checked={chosen === band.grades.length}
                  indeterminate={chosen > 0 && chosen < band.grades.length}
                  onChange={(e) => toggle(band.grades, e.target.checked)}
                >
                  <span className="os-setup-band__label">{band.label}</span>
                </Checkbox>
                <span className="os-setup-band__count">{chosen} of {band.grades.length}</span>
              </div>
              <div className="os-setup-band__grades">
                {band.grades.map((grade) => (
                  <Checkbox key={grade} id={`grade-${grade}`} checked={selectedGrades.has(grade)} onChange={(e) => toggle([grade], e.target.checked)}>
                    Grade {grade}
                  </Checkbox>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="os-setup-note">
        {selectedGrades.size} grade{selectedGrades.size === 1 ? "" : "s"} selected. Grades 12 and 13 are selected together because they share the A/L streams.
      </p>
    </div>
  );
}
