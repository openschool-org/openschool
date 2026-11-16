import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "antd";
import { BankOutlined, InfoCircleOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import StepShell from "@/features/school/components/setup/StepShell";
import { AL_STREAM_DEFS, type AlStreamsByGradeState } from "@/features/school/setupConstants";

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
  alStreams: AlStreamsByGradeState;
  setAlStreams: Dispatch<SetStateAction<AlStreamsByGradeState>>;
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
      icon={BankOutlined}
      title="Classes"
      subtitle="Set the academic year, section counts, and A/L streams. OpenSchool will create the class names for you."
    >
      <div className="os-class-year-field">
        <TextField
          id="ss-year-label"
          label="Academic year label"
          helperText="This label is used for the classes created in this setup."
          placeholder="e.g. 2026"
          value={yearLabel}
          onChange={setYearLabel}
        />
        <NumberField
          id="ss-class-capacity"
          label="Capacity for every class"
          helperText="Applies to all regular and A/L classes. Room capacities are configured separately."
          min={1}
          max={200}
          value={classCapacity}
          onChange={(value) => setClassCapacity(value ?? 1)}
        />
      </div>

      {orderedSelectedGrades.length === 0 ? (
        <div className="os-class-empty-state">
          <InfoCircleOutlined className="os-text-lg" />
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
                        <NumberField
                          id={`sections-${gradeNumber}`}
                          label={`Sections for Grade ${gradeNumber}`}
                          min={0}
                          max={10}
                          value={count}
                          onChange={(value) => setSectionsPerGrade((prev) => ({ ...prev, [gradeNumber]: value ?? 0 }))}
                        />
                      </div>
                      {selectedMediumNames.length > 0 && count > 0 && (
                        <div className="os-class-medium-grid">
                          {Array.from({ length: count }).map((_, i) => (
                            <SelectField
                              key={i}
                              id={`section-medium-${gradeNumber}-${i}`}
                              label={`Section ${gradeNumber}-${String.fromCharCode(65 + i)} medium`}
                              value={sectionMediums[`${gradeNumber}-${i}`] ?? selectedMediumNames[0] ?? ""}
                              onChange={(value) => setSectionMediums((prev) => ({ ...prev, [`${gradeNumber}-${i}`]: value }))}
                              options={[{ value: "", label: "No medium" }, ...selectedMediumNames.map((medium) => ({ value: medium, label: medium }))]}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {alGradeNumbers.map((gradeNumber) => {
            const gradeStreams = alStreams[gradeNumber];
            return (
              <section key={gradeNumber} className="os-class-section" aria-labelledby={`al-streams-title-${gradeNumber}`}>
                <div className="os-class-section__heading">
                  <div>
                    <h3 id={`al-streams-title-${gradeNumber}`}>Grade {gradeNumber} A/L streams</h3>
                    <p>Configure Grade {gradeNumber} independently. These settings do not change Grade {gradeNumber === 12 ? 13 : 12}.</p>
                  </div>
                </div>
                <p className="os-class-section__hint">Enable the streams and set a code and section count for this grade.</p>
                <div className="os-al-stream-list">
                  {AL_STREAM_DEFS.map((def) => {
                    const cfg = gradeStreams[def.key];
                    return (
                      <div key={def.key} className={`os-al-stream-row ${cfg.enabled ? "" : "is-disabled"}`}>
                        <div className="os-al-stream-row__name">
                          <Checkbox
                            id={`al-${gradeNumber}-${def.key}`}
                            checked={cfg.enabled}
                            onChange={(e) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], enabled: e.target.checked } } }))}
                          >
                            {def.label}
                          </Checkbox>
                        </div>
                        <TextField
                          id={`al-code-${gradeNumber}-${def.key}`}
                          label="Stream code"
                          maxLength={3}
                          disabled={!cfg.enabled}
                          value={cfg.code}
                          onChange={(value) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], code: value } } }))}
                        />
                        <NumberField
                          id={`al-sections-${gradeNumber}-${def.key}`}
                          label="Sections"
                          min={0}
                          max={10}
                          disabled={!cfg.enabled}
                          value={cfg.sections}
                          onChange={(value) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], sections: value ?? 0 } } }))}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="os-class-section__hint os-class-section__hint--example">
                  Example: Physical Science with code “M” and 2 sections creates Grade {gradeNumber}-M1 and Grade {gradeNumber}-M2.
                </p>
              </section>
            );
          })}
        </>
      )}
    </StepShell>
  );
}
