import { useState } from "react";
import { TrashCan } from "@carbon/icons-react";
import { Button, NumberInput, InlineNotification, SkeletonText, Dropdown } from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGrades } from "../../../queries/useGrades";
import { useSubjects } from "../../../queries/useSubjects";
import {
  useSubjectPeriodRequirements,
  useUpsertSubjectPeriodRequirement,
  useDeleteSubjectPeriodRequirement,
} from "../../../queries/timetable/useSubjectPeriodRequirements";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import type { Grade } from "../../../services/grade";
import type { SubjectPeriodRequirement } from "../../../services/timetable/subjectPeriodRequirement";

export default function SubjectRequirements() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: subjects } = useSubjects();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const yearId = currentYear?.id ?? "";
  const gradeId = selectedGrade?.id ?? "";
  const { data: requirements, isLoading } = useSubjectPeriodRequirements(yearId, gradeId);
  const upsert = useUpsertSubjectPeriodRequirement();
  const remove = useDeleteSubjectPeriodRequirement(yearId, gradeId);

  const [toRemove, setToRemove] = useState<SubjectPeriodRequirement | null>(null);

  const requirementFor = (subjectId: string) =>
    requirements?.find((r) => r.subject_id === subjectId);

  const periodsFor = (subjectId: string) =>
    requirementFor(subjectId)?.periods_per_week ?? 0;

  const labPeriodsFor = (subjectId: string) =>
    requirementFor(subjectId)?.lab_periods_per_week ?? 0;

  const doubleBlocksFor = (subjectId: string) =>
    requirementFor(subjectId)?.double_period_blocks ?? 0;

  const handleChange = (subjectId: string, periodsPerWeek: number, labPeriodsPerWeek: number, doublePeriodBlocks: number) => {
    if (!yearId || !gradeId) return;
    const maxBlocks = Math.floor(periodsPerWeek / 2);
    upsert.mutate({
      academic_year_id: yearId,
      grade_id: gradeId,
      subject_id: subjectId,
      periods_per_week: periodsPerWeek,
      lab_periods_per_week: Math.min(labPeriodsPerWeek, periodsPerWeek),
      double_period_blocks: Math.min(doublePeriodBlocks, maxBlocks),
    });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Subject Period Requirements</h1>
          <p className="os-page__subtitle">
            Weekly periods required per subject, per grade. The timetable validator checks each class's timetable
            against these before it can be submitted for review. Set "Double blocks / week" for subjects that run
            some periods as one back-to-back pair (common for AL Grade 12/13 subjects) — e.g. 2 blocks out of 6
            periods/week pairs up 4 of them and leaves the other 2 as regular singles. The auto-generator places
            exactly that many double blocks, not all of the subject's periods.
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
            {remove.isError && (
              <InlineNotification
                kind="error"
                title="Could not clear requirement"
                subtitle={getErrorMessage(remove.error)}
                lowContrast
                onClose={() => remove.reset()}
                style={{ maxWidth: "100%", marginBottom: "1rem" }}
              />
            )}
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ width: "10rem" }}>Periods / week</th>
                  <th style={{ width: "10rem" }}>Lab periods / week</th>
                  <th style={{ width: "10rem" }}>Double blocks / week</th>
                  <th style={{ width: "4rem" }}>{null}</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const requirement = requirementFor(s.id);
                  const periods = periodsFor(s.id);
                  const doubleBlocks = doubleBlocksFor(s.id);
                  const maxBlocks = Math.floor(periods / 2);
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <NumberInput
                          id={`periods-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={20}
                          value={periods}
                          onChange={(_e, { value }) => handleChange(s.id, Number(value ?? 0), labPeriodsFor(s.id), doubleBlocks)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          id={`lab-periods-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={periods}
                          value={labPeriodsFor(s.id)}
                          disabled={periods === 0}
                          onChange={(_e, { value }) => handleChange(s.id, periods, Number(value ?? 0), doubleBlocks)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          id={`double-blocks-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={maxBlocks}
                          value={doubleBlocks}
                          disabled={maxBlocks === 0}
                          helperText={maxBlocks > 0 ? `up to ${maxBlocks}` : undefined}
                          onChange={(_e, { value }) => handleChange(s.id, periods, labPeriodsFor(s.id), Number(value ?? 0))}
                        />
                      </td>
                      <td>
                        {/* Clearing removes the row entirely, which is not the
                            same as setting 0 periods — an unset subject is not
                            checked by the timetable validator at all. */}
                        <Button
                          hasIconOnly
                          kind="ghost"
                          size="sm"
                          iconDescription="Clear requirement"
                          renderIcon={TrashCan}
                          disabled={!requirement || remove.isPending}
                          onClick={() => requirement && setToRemove(requirement)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!toRemove}
        title="Clear requirement"
        description={
          <>
            Clear the weekly period requirement for{" "}
            <strong>{toRemove?.subject_name}</strong> in {selectedGrade?.name}?
            The timetable validator will stop checking this subject for this
            grade until a requirement is set again.
          </>
        }
        isPending={remove.isPending}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove.id, { onSettled: () => setToRemove(null) });
        }}
      />
    </div>
  );
}
