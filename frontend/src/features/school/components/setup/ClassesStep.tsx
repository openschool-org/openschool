import type { Dispatch, SetStateAction } from "react";
import { TextInput, NumberInput, Select, SelectItem, Checkbox } from "@carbon/react";
import { Building } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";
import { AL_STREAM_DEFS, type AlStreamsState } from "@/features/school/setupConstants";

interface Props {
  yearLabel: string;
  setYearLabel: Dispatch<SetStateAction<string>>;
  orderedSelectedGrades: number[];
  regularGradeNumbers: number[];
  alGradeNumbers: number[];
  sectionsPerGrade: Record<number, number>;
  setSectionsPerGrade: Dispatch<SetStateAction<Record<number, number>>>;
  selectedMediumNames: string[];
  sectionMediums: Record<string, string>;
  setSectionMediums: Dispatch<SetStateAction<Record<string, string>>>;
  alStreams: AlStreamsState;
  setAlStreams: Dispatch<SetStateAction<AlStreamsState>>;
}

export default function ClassesStep({
  yearLabel,
  setYearLabel,
  orderedSelectedGrades,
  regularGradeNumbers,
  alGradeNumbers,
  sectionsPerGrade,
  setSectionsPerGrade,
  selectedMediumNames,
  sectionMediums,
  setSectionMediums,
  alStreams,
  setAlStreams,
}: Props) {
  return (
    <StepShell
      icon={Building}
      title="Classes"
      subtitle="Sections are auto-named (10-A, 10-B, …); Grade 12/13 use A/L streams instead (12-M1, 12-C1, …)."
    >
      <TextInput
        id="ss-year-label"
        labelText="Academic year label"
        value={yearLabel}
        onChange={(e) => setYearLabel(e.target.value)} className="os-mb-5"
      />
      {orderedSelectedGrades.length === 0 ? (
        <p className="os-text-md os-c-tertiary">
          No grades were selected in the previous step, so there's nothing to add classes to yet.
        </p>
      ) : (
        <>
          {regularGradeNumbers.length > 0 && (
            <div className={`os-grid os-gap-3 ${alGradeNumbers.length > 0 ? "os-mb-7" : "os-mb-0"}`}>
              {regularGradeNumbers.map((gradeNumber) => {
                const count = sectionsPerGrade[gradeNumber] ?? 1;
                return (
                  <div key={gradeNumber} className="os-py-2 os-px-0 os-border-layer-hover-b">
                    <div className="os-flex os-items-center os-gap-4">
                      <span className="os-flex-1 os-text-md os-fw-500 os-c-primary">Grade {gradeNumber}</span>
                      <NumberInput
                        id={`sections-${gradeNumber}`}
                        label="Sections"
                        size="sm"
                        min={0}
                        max={10}
                        value={count}
                        onChange={(_e, { value }) =>
                          setSectionsPerGrade((prev) => ({ ...prev, [gradeNumber]: value === "" ? 0 : Number(value) }))
                        }
                      />
                    </div>
                    {selectedMediumNames.length > 0 && count > 0 && (
                      <div className="os-flex os-wrap os-gap-2 os-mt-2">
                        {Array.from({ length: count }).map((_, i) => (
                          <Select
                            key={i}
                            id={`section-medium-${gradeNumber}-${i}`}
                            labelText={`${gradeNumber}-${String.fromCharCode(65 + i)}`}
                            size="sm" className="os-min-w-9"
                            value={sectionMediums[`${gradeNumber}-${i}`] ?? ""}
                            onChange={(e) =>
                              setSectionMediums((prev) => ({ ...prev, [`${gradeNumber}-${i}`]: e.target.value }))
                            }
                          >
                            <SelectItem value="" text="No medium" />
                            {selectedMediumNames.map((m) => (
                              <SelectItem key={m} value={m} text={m} />
                            ))}
                          </Select>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {alGradeNumbers.length > 0 && (
            <div>
              <p className="os-mt-0 os-mx-0 os-mb-1 os-text-sm os-fw-600 os-c-primary">
                A/L Streams - {alGradeNumbers.map((n) => `Grade ${n}`).join(" & ")}
              </p>
              <p className="os-mt-0 os-mx-0 os-mb-3h os-text-xs os-c-tertiary">
                Applied to both A/L grades. Uncheck streams your school doesn't offer, and adjust the code and
                section count for each.
              </p>
              <div className="os-grid os-gap-2">
                {AL_STREAM_DEFS.map((def) => {
                  const cfg = alStreams[def.key];
                  return (
                    <div
                      key={def.key} className={`os-flex os-items-center os-gap-3 os-py-2 os-px-1 os-border-layer-hover-b ${cfg.enabled ? "" : "os-opacity-50"}`}
                    >
                      <Checkbox
                        id={`al-${def.key}`}
                        labelText={def.label}
                        checked={cfg.enabled}
                        onChange={(_e, { checked }) =>
                          setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], enabled: checked } }))
                        }
                      />
                      <div className="os-flex-1" />
                      <TextInput
                        id={`al-code-${def.key}`}
                        labelText="Code"
                        size="sm"
                        maxLength={3}
                        disabled={!cfg.enabled}
                        value={cfg.code} className="os-w-5"
                        onChange={(e) =>
                          setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], code: e.target.value } }))
                        }
                      />
                      <NumberInput
                        id={`al-sections-${def.key}`}
                        label="Sections"
                        size="sm"
                        min={0}
                        max={10}
                        disabled={!cfg.enabled}
                        value={cfg.sections}
                        onChange={(_e, { value }) =>
                          setAlStreams((prev) => ({
                            ...prev,
                            [def.key]: { ...prev[def.key], sections: value === "" ? 0 : Number(value) },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <p className="os-mt-3 os-mx-0 os-mb-0 os-text-xs os-c-tertiary">
                Example: Physical Science with code "M" and 2 sections creates{" "}
                {alGradeNumbers.map((n) => `${n}-M1, ${n}-M2`).join(", ")}.
              </p>
            </div>
          )}
        </>
      )}
    </StepShell>
  );
}
