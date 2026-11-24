import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { SkeletonText } from "@/shared/ui/Skeleton";
import { useClass, useClassSubjectTeachers } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import { useGradeSections, useGradeSectionPeriods } from "@/features/timetable/queries/useGradeSections";
import {
  useTimetable,
  useTimetableEntries,
  useTimetableValidation,
  useTimetableStatusHistory,
  useSubmitTimetable,
  usePublishTimetable,
} from "@/features/timetable/queries/useTimetables";
import { useTimetableCell } from "@/features/timetable/hooks/useTimetableCell";
import { subjectsForClass, withCellTeacher } from "@/features/timetable/lib/editorLists";
import WeeklyTimetable from "@/features/timetable/components/WeeklyTimetable";
import TimetableCellModal from "@/features/timetable/components/TimetableCellModal";
import TimetableValidationModal from "@/features/timetable/components/TimetableValidationModal";
import { TimetableEditorHeader, TimetableStatusHistory } from "@/features/timetable/components/TimetableEditorParts";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export default function TimetableEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: timetable, isLoading } = useTimetable(id);
  const { data: entries } = useTimetableEntries(id);
  const { data: cls } = useClass(timetable?.class_id ?? "");
  usePageTitle(cls ? `Timetable ${cls.name}` : null);
  const { data: grades } = useGrades();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const { data: subjects } = useSubjects();
  const { data: classrooms } = useClassrooms();
  const { data: gradeSections } = useGradeSections(timetable?.academic_year_id ?? "");
  const { data: classSubjects } = useClassSubjectTeachers(timetable?.class_id ?? "");
  const { data: history } = useTimetableStatusHistory(id);
  const { data: validation, refetch: runValidation, isFetching: validating } = useTimetableValidation(id);

  const gradeSection = useMemo(() => gradeSections?.find((gs) => cls && gs.grade_ids.includes(cls.grade_id)), [gradeSections, cls]);
  const { data: periods } = useGradeSectionPeriods(gradeSection?.id ?? "");

  const submit = useSubmitTimetable(id);
  const publish = usePublishTimetable(id);
  const cell = useTimetableCell(id, entries);

  const [validationOpen, setValidationOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name ?? "";
  const cellSubjects = subjectsForClass(subjects ?? [], classSubjects?.map((cs) => cs.subject_id) ?? [], gradeName);
  const cellTeachers = withCellTeacher(teacherPage?.items ?? [], cell.current);

  if (isLoading || !timetable) {
    return (
      <div className="os-page">
        <SkeletonText width="30%" />
      </div>
    );
  }

  return (
    <div className="os-page">
      <TimetableEditorHeader
        title={`${gradeName} - ${cls?.name ?? ""}`}
        timetable={timetable}
        validating={validating}
        onBack={() => navigate(-1)}
        onValidate={() => { setValidationOpen(true); runValidation(); }}
        submit={submit}
        publish={publish}
      />

      <MutationErrorNotification isError={submit.isError} error={submit.error} title="Could not submit" fallback="Fix the validation issues shown by Validate, then try again." onClose={() => submit.reset()} />
      <MutationErrorNotification isError={publish.isError} error={publish.error} title="Could not publish" onClose={() => publish.reset()} />

      <div className="os-section os-p-4">
        {!gradeSection ? (
          <EmptyState title="No grade section configured" description="Assign this class's grade to a Grade Section (with a period grid) before building the timetable." />
        ) : !periods?.length ? (
          <EmptyState title="No periods configured" description="Open Grade Sections and generate/configure the period grid for this section." />
        ) : (
          <WeeklyTimetable
            entries={entries ?? []}
            periods={periods}
            showToday={false}
            detail={(e) => e.teacher_name ?? ""}
            onCellClick={timetable.status === "draft" ? cell.open : undefined}
          />
        )}
      </div>

      <TimetableStatusHistory history={history} />

      <TimetableCellModal
        cell={cell.cell}
        form={cell.form}
        onFormChange={cell.setForm}
        subjects={cellSubjects}
        teachers={cellTeachers}
        onTeacherSearch={setTeacherSearch}
        classrooms={classrooms ?? []}
        canClear={!!cell.current}
        save={cell.saveEntries}
        clear={cell.deleteEntry}
        onSave={cell.save}
        onClear={() => setConfirmingClear(true)}
        onClose={cell.close}
      />

      <ConfirmDeleteModal
        open={confirmingClear}
        title="Clear cell"
        description="Clear this period's assignment? You can reassign it afterwards."
        confirmLabel="Clear"
        pendingLabel="Clearing…"
        subject="Cell"
        successVerb="cleared"
        mutation={cell.deleteEntry}
        onClose={() => setConfirmingClear(false)}
        onConfirm={cell.clear}
        onSuccess={cell.close}
      />

      <TimetableValidationModal open={validationOpen} validating={validating} validation={validation} onClose={() => setValidationOpen(false)} />
    </div>
  );
}
