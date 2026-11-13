import { useMemo, useState } from "react";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
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
    <SelectField
      id="marks-term"
      label="Term"
      className="os-min-w-12"
      placeholder="Choose a term…"
      value={effectiveTermId}
      onChange={(v) => { setTermId(v); setTermTouched(true); }}
      options={(terms ?? []).map((t) => ({ value: t.id, label: t.is_current ? `${t.name} (current)` : t.name }))}
    />
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
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => unsavedGuard.guard(() => { setMode("overview"); setClassId(""); setSubjectId(""); })} className="os-mb-2 os-p-0">
            Back to overview
          </Button>
          <h1 className="os-page__title">Record marks</h1>
          <p className="os-page__subtitle">Record term marks for classes and subjects you teach</p>
        </div>
      </div>

      <div className="os-section os-mb-6">
        <div className="os-section__header os-wrap os-row-gap-3">
          <div className="os-flex os-gap-3 os-wrap os-w-full">
            <SelectField
              id="record-class"
              label="Class"
              className="os-min-w-12"
              placeholder="Choose a class…"
              value={classId}
              onChange={(v) => { setClassId(v); setSubjectId(""); }}
              options={uniqueClasses.map((c) => ({ value: c.id, label: `${c.grade_name} - ${c.name}` }))}
            />
            <SelectField
              id="record-subject"
              label="Subject"
              className="os-min-w-12"
              placeholder="Choose a subject…"
              value={subjectId}
              disabled={!classId}
              onChange={setSubjectId}
              options={classSubjects.map((s) => ({ value: s.id, label: s.name }))}
            />
            {termSelector}
            {ready && (
              <div className="os-flex os-items-center os-gap-4 os-ml-auto os-self-end">
                <span className="os-text-sm os-c-secondary">Max Marks: <strong>{maxMarks}</strong></span>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!students?.length || !draft.hasUnsaved} loading={saveMarks.isPending}>
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
              {saveMarks.isSuccess && <Alert type="success" showIcon title="Marks saved successfully" />}
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
