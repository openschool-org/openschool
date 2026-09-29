import type { Dispatch, SetStateAction } from "react";
import { Checkbox, NumberInput, Select, SelectItem, TextInput } from "@carbon/react";
import { Building, Information } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";
import { AL_STREAM_DEFS, type AlStreamsState } from "@/features/school/setupConstants";

interface Props {
  yearLabel: string;
  setYearLabel: Dispatch<SetStateAction<string>>;
  classCapacity: number;
  setClassCapacity: Dispatch<SetStateAction<number>>;
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
  classCapacity,
  setClassCapacity,
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
      subtitle="Set the academic year, section counts, and A/L streams. OpenSchool will create the class names for you."
    >
      <div className="os-class-year-field">
        <TextInput
          id="ss-year-label"
          labelText="Academic year label"
          helperText="This label is used for the classes created in this setup."
          placeholder="e.g. 2026"
          value={yearLabel}
          onChange={(e) => setYearLabel(e.target.value)}
        />
        <NumberInput
          id="ss-class-capacity"
          label="Capacity for every class"
          helperText="Applies to all regular and A/L classes. Room capacities are configured separately."
          min={1}
          max={200}
          value={classCapacity}
          onChange={(_e, { value }) => setClassCapacity(value === "" ? 1 : Number(value))}
        />
      </div>

      {orderedSelectedGrades.length === 0 ? (
        <div className="os-class-empty-state">
          <Information size={20} />
          <p>No grades were selected in the previous step, so there is nothing to add classes to yet.</p>
        </div>
      ) : (
        <>
          {regularGradeNumbers.length > 0 && (
            <section className={`os-class-section ${alGradeNumbers.length > 0 ? "os-mb-7" : ""}`} aria-labelledby="regular-classes-title">
              <div className="os-class-section__heading">
                <div>
                  <h3 id="regular-classes-title">Regular grades</h3>
                  <p>Choose the number of sections for each grade and assign a medium where needed.</p>
                </div>
              </div>
              <div className="os-class-grade-list">
                {regularGradeNumbers.map((gradeNumber) => {
                  const count = sectionsPerGrade[gradeNumber] ?? 1;
                  return (
                    <div key={gradeNumber} className="os-class-grade-row">
                      <div className="os-class-grade-row__topline">
                        <div>
                          <h4>Grade {gradeNumber}</h4>
                          <p>{count > 0 ? `${count} section${count === 1 ? "" : "s"} will be created` : "No sections will be created"}</p>
                        </div>
                        <NumberInput
                          id={`sections-${gradeNumber}`}
                          label={`Sections for Grade ${gradeNumber}`}
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
                        <div className="os-class-medium-grid">
                          {Array.from({ length: count }).map((_, i) => (
                            <Select
                              key={i}
                              id={`section-medium-${gradeNumber}-${i}`}
                              labelText={`Section ${gradeNumber}-${String.fromCharCode(65 + i)} medium`}
                              size="sm"
                              value={sectionMediums[`${gradeNumber}-${i}`] ?? selectedMediumNames[0] ?? ""}
                              onChange={(e) => setSectionMediums((prev) => ({ ...prev, [`${gradeNumber}-${i}`]: e.target.value }))}
                            >
                              <SelectItem value="" text="No medium" />
                              {selectedMediumNames.map((medium) => <SelectItem key={medium} value={medium} text={medium} />)}
                            </Select>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {alGradeNumbers.length > 0 && (
            <section className="os-class-section" aria-labelledby="al-streams-title">
              <div className="os-class-section__heading">
                <div>
                  <h3 id="al-streams-title">A/L streams</h3>
                  <p>Applied to {alGradeNumbers.map((n) => `Grade ${n}`).join(" and ")}. Enable the streams your school offers.</p>
                </div>
              </div>
              <p className="os-class-section__hint">Set a short code and section count for each enabled stream.</p>
              <div className="os-al-stream-list">
                {AL_STREAM_DEFS.map((def) => {
                  const cfg = alStreams[def.key];
                  return (
                    <div key={def.key} className={`os-al-stream-row ${cfg.enabled ? "" : "is-disabled"}`}>
                      <div className="os-al-stream-row__name">
                        <Checkbox
                          id={`al-${def.key}`}
                          labelText={def.label}
                          checked={cfg.enabled}
                          onChange={(_e, { checked }) => setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], enabled: checked } }))}
                        />
                      </div>
                      <TextInput
                        id={`al-code-${def.key}`}
                        labelText="Stream code"
                        size="sm"
                        maxLength={3}
                        disabled={!cfg.enabled}
                        value={cfg.code}
                        onChange={(e) => setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], code: e.target.value } }))}
                      />
                      <NumberInput
                        id={`al-sections-${def.key}`}
                        label="Sections"
                        size="sm"
                        min={0}
                        max={10}
                        disabled={!cfg.enabled}
                        value={cfg.sections}
                        onChange={(_e, { value }) => setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], sections: value === "" ? 0 : Number(value) } }))}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="os-class-section__hint os-class-section__hint--example">
                Example: Physical Science with code “M” and 2 sections creates {alGradeNumbers.map((n) => `${n}-M1, ${n}-M2`).join(", ")}.
              </p>
            </section>
          )}
        </>
      )}
    </StepShell>
  );
}
