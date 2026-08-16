import type { Dispatch, SetStateAction } from "react";
import { TextInput, NumberInput, Select, SelectItem, Checkbox } from "@carbon/react";
import { Building } from "@carbon/icons-react";
import StepShell from "./StepShell";
import { AL_STREAM_DEFS, type AlStreamsState } from "../constants";

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
        labelText="Academic Year Label"
        value={yearLabel}
        onChange={(e) => setYearLabel(e.target.value)}
        style={{ marginBottom: "1.25rem" }}
      />
      {orderedSelectedGrades.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
          No grades were selected in the previous step, so there's nothing to add classes to yet.
        </p>
      ) : (
        <>
          {regularGradeNumbers.length > 0 && (
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: alGradeNumbers.length > 0 ? "1.75rem" : 0 }}>
              {regularGradeNumbers.map((gradeNumber) => {
                const count = sectionsPerGrade[gradeNumber] ?? 1;
                return (
                  <div key={gradeNumber} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, color: "#161616" }}>Grade {gradeNumber}</span>
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {Array.from({ length: count }).map((_, i) => (
                          <Select
                            key={i}
                            id={`section-medium-${gradeNumber}-${i}`}
                            labelText={`${gradeNumber}-${String.fromCharCode(65 + i)}`}
                            size="sm"
                            style={{ minWidth: "9rem" }}
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
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "#161616" }}>
                A/L Streams - {alGradeNumbers.map((n) => `Grade ${n}`).join(" & ")}
              </p>
              <p style={{ margin: "0 0 0.875rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
                Applied to both A/L grades. Uncheck streams your school doesn't offer, and adjust the code and
                section count for each.
              </p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {AL_STREAM_DEFS.map((def) => {
                  const cfg = alStreams[def.key];
                  return (
                    <div
                      key={def.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.25rem",
                        borderBottom: "1px solid #f4f4f4",
                        opacity: cfg.enabled ? 1 : 0.5,
                      }}
                    >
                      <Checkbox
                        id={`al-${def.key}`}
                        labelText={def.label}
                        checked={cfg.enabled}
                        onChange={(_e, { checked }) =>
                          setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], enabled: checked } }))
                        }
                      />
                      <div style={{ flex: 1 }} />
                      <TextInput
                        id={`al-code-${def.key}`}
                        labelText="Code"
                        size="sm"
                        maxLength={3}
                        disabled={!cfg.enabled}
                        value={cfg.code}
                        style={{ width: "5rem" }}
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
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "#8d8d8d" }}>
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
