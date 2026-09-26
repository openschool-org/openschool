import { useState } from "react";
import { NumberInput, SkeletonText, Dropdown } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import {
  useSubjectPeriodRequirements,
  useUpsertSubjectPeriodRequirement,
  useDeleteSubjectPeriodRequirement,
} from "@/features/timetable/queries/useSubjectPeriodRequirements";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { Grade } from "@/features/academics/api/grade";
import type { SubjectPeriodRequirement } from "@/features/timetable/api/subjectPeriodRequirement";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

export default function SubjectRequirements({ inline = false }: { inline?: boolean }) {
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
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Subject period requirements</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Weekly periods each grade needs per subject.
              <InfoTip>A class timetable must meet these before it can go for review. Double blocks are back-to-back pairs: 2 blocks out of 6 periods pairs up 4 and leaves 2 single. The generator places exactly that many.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
        <div className="os-max-w-20 os-mb-6">
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
            <MutationErrorNotification
              isError={upsert.isError}
              error={upsert.error}
              title="Could not save"
              onClose={() => upsert.reset()} className="os-mb-4"
            />
            <MutationErrorNotification
              isError={remove.isError}
              error={remove.error}
              title="Could not clear requirement"
              onClose={() => remove.reset()} className="os-mb-4"
            />
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="os-w-10">Periods / week</th>
                  <th className="os-w-10">Lab periods / week</th>
                  <th className="os-w-10">Double blocks / week</th>
                  <th className="os-w-4">{null}</th>
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
                        {/* Clearing removes the row (unset), distinct from setting 0 periods (checked by the validator as zero). */}
                        <RemoveIconButton
                          label="Clear requirement"
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
        confirmLabel="Clear"
        pendingLabel="Clearing…"
        subject="Requirement"
        successVerb="cleared"
        mutation={remove}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove.id);
        }}
      />
    </div>
  );
}
