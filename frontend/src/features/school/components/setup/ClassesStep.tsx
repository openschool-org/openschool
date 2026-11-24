import TextField from "@/shared/ui/TextField";
import NumberField from "@/shared/ui/NumberField";
import RegularClassesTable from "@/features/school/components/setup/RegularClassesTable";
import AlStreamsTable from "@/features/school/components/setup/AlStreamsTable";
import type { SchoolSetupState } from "@/features/school/hooks/useSchoolSetupState";

export default function ClassesStep({ state: s }: { state: SchoolSetupState }) {
  return (
    <div>
      <div className="os-setup-pair os-setup-pair--narrow">
        <TextField
          id="ss-year-label"
          label="Academic year"
          helperText="Created as the current year."
          placeholder="e.g. 2026"
          value={s.yearLabel}
          onChange={s.setYearLabel}
        />
        <NumberField
          id="ss-class-capacity"
          label="Students per class"
          helperText="Used for every class. You can change single classes later."
          min={1}
          max={200}
          value={s.classCapacity}
          onChange={(value) => s.setClassCapacity(value ?? 1)}
        />
      </div>

      {s.orderedSelectedGrades.length === 0 ? (
        <p className="os-setup-empty">No grades were selected in the Grades step, so there are no classes to create.</p>
      ) : (
        <>
          {s.regularGradeNumbers.length > 0 && (
            <section className="os-setup-block" aria-labelledby="regular-classes-title">
              <h3 id="regular-classes-title" className="os-setup-section__title">Sections per grade</h3>
              <RegularClassesTable
                grades={s.regularGradeNumbers}
                sectionsPerGrade={s.sectionsPerGrade}
                setSectionsPerGrade={s.setSectionsPerGrade}
                mediums={s.selectedMediumNames}
                sectionMediums={s.sectionMediums}
                setSectionMediums={s.setSectionMediums}
              />
            </section>
          )}
          {s.alGradeNumbers.length > 0 && (
            <div className="os-setup-al-grid">
              {s.alGradeNumbers.map((grade) => (
                <section key={grade} className="os-setup-block" aria-labelledby={`al-streams-title-${grade}`}>
                  <h3 id={`al-streams-title-${grade}`} className="os-setup-section__title">Grade {grade} A/L streams</h3>
                  <AlStreamsTable grade={grade} streams={s.alStreams[grade]} setAlStreams={s.setAlStreams} />
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
