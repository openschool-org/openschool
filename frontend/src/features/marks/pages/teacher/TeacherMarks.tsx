import { useMemo, useState } from "react";
import { Select, SelectItem, Button, InlineNotification } from "@carbon/react";
import { Save, ArrowLeft } from "@carbon/icons-react";
import { useMyTeacherProfile, useTeacherWorkload } from "@/features/teachers/queries/useTeachers";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms, useCurrentTerm } from "@/features/school/queries/useTerms";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useClassMarks, useSaveClassMarks } from "@/features/marks/queries/useTermMarks";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import { useMarksDraft } from "@/features/marks/hooks/useMarksDraft";
import MarksOverview from "@/features/marks/components/MarksOverview";
import MarksEntryTable from "@/features/marks/components/MarksEntryTable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";

export default function TeacherMarks() {
  const { data: teacher, isLoading: teacherLoading } = useMyTeacherProfile();
  const { data: workload, isLoading: workloadLoading } = useTeacherWorkload(teacher?.id ?? "");
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id ?? "");
  const { data: currentTerm } = useCurrentTerm();
  const { data: subjects } = useSubjects();

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [termTouched, setTermTouched] = useState(false);
  const [mode, setMode] = useState<"overview" | "entry">("overview");

  // The current term is preselected until the teacher picks one themselves.
  const effectiveTermId = termTouched ? termId : termId || currentTerm?.id || "";

  const { data: students, isLoading: studentsLoading } = useStudentsByClass(classId);
  const { data: rows, isLoading: marksLoading } = useClassMarks(classId, effectiveTermId, subjectId);
  const saveMarks = useSaveClassMarks(classId);
  const draft = useMarksDraft(rows, `${effectiveTermId}:${subjectId}:${classId}`);
  const unsavedGuard = useUnsavedChangesGuard(draft.hasUnsaved);

  const currentRows = useMemo(() => (workload ?? []).filter((r) => r.academic_year_is_current), [workload]);
  const uniqueClasses = useMemo(() => [...new Map(currentRows.map((r) => [r.class_id, { id: r.class_id, name: r.class_name, grade_name: r.grade_name }])).values()], [currentRows]);
  const classSubjects = useMemo(
    () => [...new Map(currentRows.filter((r) => r.class_id === classId).map((r) => [r.subject_id, { id: r.subject_id, name: r.subject_name }])).values()],
    [currentRows, classId],
  );
  const maxMarks = subjects?.find((s) => s.id === subjectId)?.max_marks ?? 100;

  const handleSave = () => {
    if (!effectiveTermId || !subjectId || !classId) return;
    saveMarks.mutate(
      {
        term_id: effectiveTermId,
        subject_id: subjectId,
        entries: Object.entries(draft.draft).map(([student_id, v]) => ({ student_id, marks: v.marks, max_marks: maxMarks, is_absent: v.isAbsent })),
      },
      { onSuccess: draft.markSaved },
    );
  };

  if (teacherLoading || workloadLoading || yearLoading) return <LoadingSpinner />;

  const termSelector = (
    <Select id="marks-term" labelText="Term" size="sm" value={effectiveTermId} onChange={(e) => { setTermId(e.target.value); setTermTouched(true); }} className="os-min-w-12">
      <SelectItem value="" text="Choose a term…" />
      {terms?.map((t) => <SelectItem key={t.id} value={t.id} text={t.is_current ? `${t.name} (current)` : t.name} />)}
    </Select>
  );

  if (mode === "overview") {
    return (
      <MarksOverview
        workload={workload}
        termId={effectiveTermId}
        termSelector={termSelector}
        onOpen={(c, s) => { setClassId(c); setSubjectId(s); setMode("entry"); }}
      />
    );
  }

  const ready = !!classId && !!subjectId && !!effectiveTermId;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={() => unsavedGuard.guard(() => { setMode("overview"); setClassId(""); setSubjectId(""); })} className="os-mb-2 os-pl-0">
            Back to overview
          </Button>
          <h1 className="os-page__title">Record marks</h1>
          <p className="os-page__subtitle">Record term marks for classes and subjects you teach</p>
        </div>
      </div>

      <div className="os-section os-mb-6">
        <div className="os-section__header os-wrap os-row-gap-3">
          <div className="os-flex os-gap-3 os-wrap os-w-full">
            <Select id="record-class" labelText="Class" size="sm" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); }} className="os-min-w-12">
              <SelectItem value="" text="Choose a class…" />
              {uniqueClasses.map((c) => <SelectItem key={c.id} value={c.id} text={`${c.grade_name} - ${c.name}`} />)}
            </Select>
            <Select id="record-subject" labelText="Subject" size="sm" value={subjectId} disabled={!classId} onChange={(e) => setSubjectId(e.target.value)} className="os-min-w-12">
              <SelectItem value="" text="Choose a subject…" />
              {classSubjects.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
            </Select>
            {termSelector}
            {ready && (
              <div className="os-flex os-items-center os-gap-4 os-ml-auto os-self-end">
                <span className="os-text-sm os-c-secondary">Max Marks: <strong>{maxMarks}</strong></span>
                <Button renderIcon={Save} size="sm" onClick={handleSave} disabled={saveMarks.isPending || !students?.length || !draft.hasUnsaved}>
                  {saveMarks.isPending ? "Saving…" : "Save marks"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!ready ? (
          <EmptyState title="Pick class, subject, and term" description="Select options above to load student mark roster." />
        ) : studentsLoading || marksLoading ? (
          <LoadingSpinner />
        ) : students?.length ? (
          <div className="os-section__body os-p-0">
            <div className="os-p-4">
              <MutationErrorNotification isError={saveMarks.isError} error={saveMarks.error} title="Could not save marks" fallback="Please try again." onClose={() => saveMarks.reset()} />
              {saveMarks.isSuccess && <InlineNotification kind="success" title="Marks saved successfully" lowContrast className="os-max-w-full" />}
            </div>
            <MarksEntryTable students={students} subjectName={subjects?.find((s) => s.id === subjectId)?.name ?? ""} maxMarks={maxMarks} draft={draft} />
          </div>
        ) : (
          <EmptyState title="No students enrolled" description="There are no students enrolled in the selected class." />
        )}
      </div>

      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
