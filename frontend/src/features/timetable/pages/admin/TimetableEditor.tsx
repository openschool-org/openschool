import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Tag, SkeletonText } from "@carbon/react";
import { useClass, useClassSubjectTeachers } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { formatDateTime } from "@/shared/lib/date";
import type { Teacher } from "@/features/teachers/api/teacher";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import { useGradeSections, useGradeSectionPeriods } from "@/features/timetable/queries/useGradeSections";
import {
  useTimetable,
  useTimetableEntries,
  useSaveTimetableEntries,
  useDeleteTimetableEntry,
  useTimetableValidation,
  useTimetableStatusHistory,
  useSubmitTimetable,
  usePublishTimetable,
} from "@/features/timetable/queries/useTimetables";
import TimetableGrid from "@/features/timetable/components/TimetableGrid";
import TimetableCellModal, { type CellForm } from "@/features/timetable/components/TimetableCellModal";
import TimetableValidationModal from "@/features/timetable/components/TimetableValidationModal";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { TIMETABLE_STATUS_TAG } from "@/shared/lib/constants/tags";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const EMPTY_FORM: CellForm = { subjectId: "", teacherId: "", classroomId: "" };
const statusLabel = (s: string) => TIMETABLE_STATUS_TAG[s as keyof typeof TIMETABLE_STATUS_TAG]?.label ?? s;

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
  const teachers = teacherPage?.items;
  const { data: subjects } = useSubjects();
  const { data: classrooms } = useClassrooms();
  const { data: gradeSections } = useGradeSections(timetable?.academic_year_id ?? "");
  const { data: classSubjects } = useClassSubjectTeachers(timetable?.class_id ?? "");
  const { data: history } = useTimetableStatusHistory(id);
  const { data: validation, refetch: runValidation, isFetching: validating } = useTimetableValidation(id);

  const gradeSection = useMemo(() => gradeSections?.find((gs) => cls && gs.grade_ids.includes(cls.grade_id)), [gradeSections, cls]);
  const { data: periods } = useGradeSectionPeriods(gradeSection?.id ?? "");

  const saveEntries = useSaveTimetableEntries(id);
  const deleteEntry = useDeleteTimetableEntry(id);
  const submit = useSubmitTimetable(id);
  const publish = usePublishTimetable(id);

  const [validationOpen, setValidationOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cell, setCell] = useState<{ day: number; period: number } | null>(null);
  const [cellForm, setCellForm] = useState<CellForm>(EMPTY_FORM);

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name ?? "";
  const isDraft = timetable?.status === "draft";

  // A-Level classes only pick from the subjects assigned to the class.
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (!/12|13/.test(gradeName)) return subjects;
    const assigned = new Set(classSubjects?.map((cs) => cs.subject_id) ?? []);
    return subjects.filter((s) => assigned.has(s.id));
  }, [subjects, classSubjects, gradeName]);

  const entryAt = (day: number, period: number) => entries?.find((e) => e.day_of_week === day && e.period_number === period);

  // The cell being edited may already have a teacher assigned who isn't
  // among the current search results (e.g. no search typed yet) - merged
  // in from the entry's own teacher_name so the field doesn't look empty.
  // employee_number is unknown here, so it's left blank in the label.
  const cellTeachers = useMemo(() => {
    const list = teachers ?? [];
    const existing = cell ? entryAt(cell.day, cell.period) : undefined;
    if (existing?.teacher_id && existing.teacher_name && !list.some((t) => t.id === existing.teacher_id)) {
      return [{ id: existing.teacher_id, full_name: existing.teacher_name, employee_number: "" } as Teacher, ...list];
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entryAt closes over `entries`, already a dep
  }, [teachers, cell, entries]);

  const openCell = (day: number, period: number) => {
    const existing = entryAt(day, period);
    setCellForm({ subjectId: existing?.subject_id ?? "", teacherId: existing?.teacher_id ?? "", classroomId: existing?.classroom_id ?? "" });
    setCell({ day, period });
  };

  const saveCell = () => {
    if (!cell) return;
    saveEntries.mutate(
      [{ day_of_week: cell.day, period_number: cell.period, subject_id: cellForm.subjectId || null, teacher_id: cellForm.teacherId || null, classroom_id: cellForm.classroomId || null }],
      { onSuccess: () => setCell(null) },
    );
  };

  const clearCell = () => {
    if (!cell) return;
    deleteEntry.mutate({ day: cell.day, period: cell.period });
  };

  if (isLoading || !timetable) {
    return (
      <div className="os-page">
        <SkeletonText width="30%" />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">
            {gradeName} - {cls?.name} <Tag type="gray" size="sm">v{timetable.version}</Tag>
          </h1>
          <p className="os-page__subtitle">
            Status: <strong>{statusLabel(timetable.status)}</strong>
            {timetable.review_comments && <> - <em>{timetable.review_comments}</em></>}
          </p>
        </div>
        <div className="os-flex os-gap-2">
          <Button kind="tertiary" onClick={() => navigate(-1)}>Back</Button>
          <Button kind="ghost" onClick={() => { setValidationOpen(true); runValidation(); }} disabled={validating}>
            {validating ? "Validating…" : "Validate"}
          </Button>
          {isDraft && (
            <Button kind="primary" onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          )}
          {timetable.status === "approved" && (
            <Button kind="primary" onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <MutationErrorNotification isError={submit.isError} error={submit.error} title="Could not submit" fallback="Fix the validation issues shown by Validate, then try again." onClose={() => submit.reset()} />
      <MutationErrorNotification isError={publish.isError} error={publish.error} title="Could not publish" onClose={() => publish.reset()} />

      <div className="os-section os-overflow-x-auto">
        {!gradeSection ? (
          <EmptyState title="No grade section configured" description="Assign this class's grade to a Grade Section (with a period grid) before building the timetable." />
        ) : !periods?.length ? (
          <EmptyState title="No periods configured" description="Open Grade Sections and generate/configure the period grid for this section." />
        ) : (
          <TimetableGrid periods={periods} entryAt={entryAt} editable={isDraft} onOpenCell={openCell} />
        )}
      </div>

      {!!history?.length && (
        <div className="os-section os-py-4 os-px-6">
          <h2 className="os-section__title os-mb-3">Status history</h2>
          {history.map((h) => (
            <div key={h.id} className="os-text-sm os-c-secondary os-mb-1h">
              <strong>{statusLabel(h.to_status)}</strong> by {h.changed_by_name} on {formatDateTime(h.changed_at)}
              {h.comment && <> - {h.comment}</>}
            </div>
          ))}
        </div>
      )}

      <TimetableCellModal
        cell={cell}
        form={cellForm}
        onFormChange={setCellForm}
        subjects={filteredSubjects}
        teachers={cellTeachers}
        onTeacherSearch={setTeacherSearch}
        classrooms={classrooms ?? []}
        canClear={!!cell && !!entryAt(cell.day, cell.period)}
        save={saveEntries}
        clear={deleteEntry}
        onSave={saveCell}
        onClear={() => setConfirmingClear(true)}
        onClose={() => setCell(null)}
      />

      <ConfirmDeleteModal
        open={confirmingClear}
        title="Clear cell"
        description="Clear this period's assignment? You can reassign it afterwards."
        confirmLabel="Clear"
        pendingLabel="Clearing…"
        subject="Cell"
        successVerb="cleared"
        mutation={deleteEntry}
        onClose={() => setConfirmingClear(false)}
        onConfirm={clearCell}
        onSuccess={() => setCell(null)}
      />

      <TimetableValidationModal open={validationOpen} validating={validating} validation={validation} onClose={() => setValidationOpen(false)} />
    </div>
  );
}
