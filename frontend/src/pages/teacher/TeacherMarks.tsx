// This file renders the TeacherMarks page, allowing teachers to record, edit, and submit term test marks for classes and subjects defined in their workload.

import { useState, useMemo } from "react";
import { Select, SelectItem, NumberInput, Button, InlineNotification, Tag } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useMyTeacherProfile, useTeacherWorkload } from "../../queries/useTeachers";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import { useSubjects } from "../../queries/useSubjects";
import { useClassMarks, useSaveClassMarks } from "../../queries/useTermMarks";
import { useClassStudents } from "../../queries/useClasses";
import { getErrorMessage } from "../../lib/errorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

export default function TeacherMarks() {
  const { data: teacher, isLoading: teacherLoading } = useMyTeacherProfile();
  const { data: workload, isLoading: workloadLoading } = useTeacherWorkload(teacher?.id ?? "");
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id ?? "");

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");

  const { data: students, isLoading: studentsLoading } = useClassStudents(classId);
  const { data: rows, isLoading: marksLoading } = useClassMarks(classId, termId, subjectId);
  const { data: subjects } = useSubjects();
  const saveMarks = useSaveClassMarks(classId);

  const [draft, setDraft] = useState<Record<string, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, number>>({});
  const [syncedFor, setSyncedFor] = useState("");

  const uniqueClasses = useMemo(() => {
    const map = new Map<string, { id: string; name: string; grade_name: string }>();
    for (const r of workload ?? []) {
      if (r.academic_year_is_current) {
        map.set(r.class_id, { id: r.class_id, name: r.class_name, grade_name: r.grade_name });
      }
    }
    return [...map.values()];
  }, [workload]);

  const classSubjects = useMemo(() => {
    if (!classId) return [];
    const subjects = (workload ?? [])
      .filter((r) => r.academic_year_is_current && r.class_id === classId)
      .map((r) => ({ id: r.subject_id, name: r.subject_name }));
    const unique = new Map<string, typeof subjects[0]>();
    for (const s of subjects) {
      unique.set(s.id, s);
    }
    return [...unique.values()];
  }, [workload, classId]);

  const currentSubject = subjects?.find((s) => s.id === subjectId);
  const defaultMaxMarks = currentSubject?.max_marks ?? 100;

  const rowsKey = `${termId}:${subjectId}:${classId}`;
  if (rows && syncedFor !== rowsKey) {
    const seeded = Object.fromEntries(rows.map((r) => [r.student_id, r.marks ?? 0]));
    setDraft(seeded);
    setSavedSnapshot(seeded);
    setSyncedFor(rowsKey);
  }

  const isRowUnsaved = (studentId: string) =>
    (draft[studentId] ?? 0) !== (savedSnapshot[studentId] ?? 0);
  const hasUnsavedChanges = Object.keys(draft).some(isRowUnsaved);

  const handleSave = () => {
    if (!termId || !subjectId || !classId) return;
    const marksToSave = draft;
    saveMarks.mutate(
      {
        term_id: termId,
        subject_id: subjectId,
        entries: Object.entries(draft).map(([student_id, marks]) => ({
          student_id,
          marks,
          max_marks: defaultMaxMarks,
        })),
      },
      { onSuccess: () => setSavedSnapshot(marksToSave) },
    );
  };

  const isLoading = teacherLoading || workloadLoading || yearLoading;
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Record Marks</h1>
          <p className="os-page__subtitle">Record term marks for classes and subjects you teach</p>
        </div>
      </div>

      <div className="os-section" style={{ marginBottom: "1.5rem" }}>
        <div className="os-section__header" style={{ flexWrap: "wrap", rowGap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", width: "100%" }}>
            <Select
              id="record-class"
              labelText="Class"
              size="sm"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSubjectId("");
              }}
              style={{ minWidth: "12rem" }}
            >
              <SelectItem value="" text="Choose a class…" />
              {uniqueClasses.map((c) => (
                <SelectItem key={c.id} value={c.id} text={`${c.grade_name} — ${c.name}`} />
              ))}
            </Select>

            <Select
              id="record-subject"
              labelText="Subject"
              size="sm"
              value={subjectId}
              disabled={!classId}
              onChange={(e) => setSubjectId(e.target.value)}
              style={{ minWidth: "12rem" }}
            >
              <SelectItem value="" text="Choose a subject…" />
              {classSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id} text={s.name} />
              ))}
            </Select>

            <Select
              id="record-term"
              labelText="Term"
              size="sm"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              style={{ minWidth: "12rem" }}
            >
              <SelectItem value="" text="Choose a term…" />
              {terms?.map((t) => (
                <SelectItem key={t.id} value={t.id} text={t.name} />
              ))}
            </Select>

            {classId && subjectId && termId && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginLeft: "auto",
                  alignSelf: "flex-end",
                }}
              >
                <span style={{ fontSize: "0.8125rem", color: "#525252" }}>
                  Max Marks: <strong>{defaultMaxMarks}</strong>
                </span>
                <Button
                  renderIcon={Save}
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    saveMarks.isPending ||
                    !students ||
                    students.length === 0 ||
                    !hasUnsavedChanges
                  }
                >
                  {saveMarks.isPending ? "Saving…" : "Save Marks"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!classId || !subjectId || !termId ? (
          <EmptyState
            title="Pick class, subject, and term"
            description="Select options above to load student mark roster."
          />
        ) : studentsLoading || marksLoading ? (
          <LoadingSpinner />
        ) : students && students.length > 0 ? (
          <div className="os-section__body" style={{ padding: 0 }}>
            {saveMarks.isError && (
              <div style={{ padding: "1rem" }}>
                <InlineNotification
                  kind="error"
                  title="Could not save marks"
                  subtitle={getErrorMessage(saveMarks.error, "Please try again.")}
                  lowContrast
                  onClose={() => saveMarks.reset()}
                />
              </div>
            )}
            {saveMarks.isSuccess && (
              <div style={{ padding: "1rem" }}>
                <InlineNotification
                  kind="success"
                  title="Marks saved successfully"
                  lowContrast
                />
              </div>
            )}

            <table className="os-table">
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}>#</th>
                  <th>Student Name</th>
                  <th>Index Number</th>
                  <th style={{ width: "8rem" }}>Marks</th>
                  <th style={{ width: "7rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const marks = draft[student.id] ?? 0;
                  const unsaved = isRowUnsaved(student.id);
                  return (
                    <tr key={student.id}>
                      <td className="os-table__muted">{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{student.full_name}</td>
                      <td className="os-table__mono">{student.index_number}</td>
                      <td>
                        <NumberInput
                          id={`marks-${student.id}`}
                          label=""
                          min={0}
                          max={defaultMaxMarks}
                          value={marks}
                          onChange={(_e, { value }) => {
                            setDraft((prev) => ({
                              ...prev,
                              [student.id]: Number(value),
                            }));
                          }}
                          size="sm"
                          hideSteppers
                        />
                      </td>
                      <td>
                        {unsaved && (
                          <Tag type="high-contrast" size="sm">
                            Unsaved
                          </Tag>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No students enrolled"
            description="There are no students enrolled in the selected class."
          />
        )}
      </div>
    </div>
  );
}
