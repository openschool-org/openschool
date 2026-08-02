import { useState } from "react";
import { NumberInput, InlineNotification, SkeletonText, Dropdown } from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGrades } from "../../../queries/useGrades";
import { useSubjects } from "../../../queries/useSubjects";
import {
  useSubjectPeriodRequirements,
  useUpsertSubjectPeriodRequirement,
} from "../../../queries/timetable/useSubjectPeriodRequirements";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import type { Grade } from "../../../services/grade";

export default function SubjectRequirements() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: subjects } = useSubjects();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const yearId = currentYear?.id ?? "";
  const gradeId = selectedGrade?.id ?? "";
  const { data: requirements, isLoading } = useSubjectPeriodRequirements(yearId, gradeId);
  const upsert = useUpsertSubjectPeriodRequirement();

  const periodsFor = (subjectId: string) =>
    requirements?.find((r) => r.subject_id === subjectId)?.periods_per_week ?? 0;

  const handleChange = (subjectId: string, value: number) => {
    if (!yearId || !gradeId) return;
    upsert.mutate({ academic_year_id: yearId, grade_id: gradeId, subject_id: subjectId, periods_per_week: value });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Subject Period Requirements</h1>
          <p className="os-page__subtitle">
            Weekly periods required per subject, per grade. The timetable validator checks each class's timetable
            against these before it can be submitted for review.
          </p>
        </div>
      </div>

      <div className="os-section" style={{ padding: "1.5rem" }}>
        <div style={{ maxWidth: "20rem", marginBottom: "1.5rem" }}>
          <Dropdown
            id="requirements-grade"
            titleText="Grade"
            label="Select a grade…"
            items={grades ?? []}
            itemToString={(g) => (g as Grade)?.name ?? ""}
            selectedItem={selectedGrade}
            onChange={({ selectedItem }) => setSelectedGrade(selectedItem ?? null)}
          />
        </div>

        {!currentYear ? (
          <EmptyState title="No current academic year" description="Set an academic year as current first." />
        ) : !selectedGrade ? (
          <EmptyState title="Select a grade" description="Choose a grade above to configure its subject periods." />
        ) : isLoading ? (
          <SkeletonText width="40%" />
        ) : !subjects || subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Add subjects under Subjects first." />
        ) : (
          <>
            {upsert.isError && (
              <InlineNotification
                kind="error"
                title="Could not save"
                subtitle={getErrorMessage(upsert.error)}
                lowContrast
                onClose={() => upsert.reset()}
                style={{ maxWidth: "100%", marginBottom: "1rem" }}
              />
            )}
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ width: "10rem" }}>Periods / week</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>
                      <NumberInput
                        id={`periods-${s.id}`}
                        label=""
                        size="sm"
                        min={0}
                        max={20}
                        value={periodsFor(s.id)}
                        onChange={(_e, { value }) => handleChange(s.id, Number(value ?? 0))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
