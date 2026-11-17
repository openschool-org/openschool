import { useState } from "react";
import { SkeletonText } from "@/shared/ui/Skeleton";
import SelectField from "@/shared/ui/SelectField";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import {
  useSubjectPeriodRequirements,
  useUpsertSubjectPeriodRequirement,
  useDeleteSubjectPeriodRequirement,
} from "@/features/timetable/queries/useSubjectPeriodRequirements";
import EmptyState from "@/shared/ui/EmptyState";
import NoCurrentYear from "@/shared/ui/NoCurrentYear";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RequirementRow from "@/features/timetable/components/RequirementRow";
import { clampRequirement, type RequirementValues } from "@/features/timetable/lib/requirements";
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

  const handleChange = (subjectId: string, values: RequirementValues) => {
    if (!yearId || !gradeId) return;
    const v = clampRequirement(values);
    upsert.mutate({
      academic_year_id: yearId,
      grade_id: gradeId,
      subject_id: subjectId,
      periods_per_week: v.periods,
      lab_periods_per_week: v.labPeriods,
      double_period_blocks: v.doubleBlocks,
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

      <div className="os-section">
        <div className="os-section__header os-tt-head">
          <div>
            <h2 className="os-section__title">Weekly periods per subject</h2>
            <p className="os-text-sm os-c-secondary os-m-0">Changes save as you type. A timetable must meet these before it can go for review.</p>
          </div>
          <div className="os-tt-create">
            <SelectField
              id="requirements-grade"
              label="Grade"
              hideLabel
              placeholder="Select a grade…"
              showSearch
              value={selectedGrade?.id ?? ""}
              onChange={(id) => setSelectedGrade(grades?.find((g) => g.id === id) ?? null)}
              options={(grades ?? []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </div>
        </div>

        {!currentYear ? (
          <NoCurrentYear />
        ) : !selectedGrade ? (
          <EmptyState title="Select a grade" description="Choose a grade above to configure its subject periods." />
        ) : isLoading ? (
          <div className="os-p-6"><SkeletonText width="40%" /></div>
        ) : !subjects || subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Add subjects under Subjects first." />
        ) : (
          <>
            <div className="os-tt-alerts">
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
            </div>
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
                {subjects.map((s) => (
                  <RequirementRow
                    key={s.id}
                    subjectId={s.id}
                    subjectName={s.name}
                    requirement={requirements?.find((r) => r.subject_id === s.id)}
                    removeDisabled={remove.isPending}
                    onChange={(v) => handleChange(s.id, v)}
                    onClear={setToRemove}
                  />
                ))}
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
