// Teacher picker is scoped to teachers already qualified for the subject, so a class assignment can't diverge from Teacher Subjects.
import { useState } from "react";
import { Link } from "react-router";
import { InlineNotification } from "@carbon/react";
import type { useAssignSubjectTeacher } from "@/features/academics/queries/useClasses";
import { useTeachersBySubject } from "@/features/teachers/queries/useTeachers";
import type { useSubjects } from "@/features/curriculum/queries/useSubjects";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";

interface Props {
  open: boolean;
  subjects: ReturnType<typeof useSubjects>["data"];
  assignSubjectTeacher: ReturnType<typeof useAssignSubjectTeacher>;
  onClose: () => void;
}

export default function AssignClassSubjectTeacherModal({
  open,
  subjects,
  assignSubjectTeacher,
  onClose,
}: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const { data: qualifiedTeachers, isLoading: teachersLoading } = useTeachersBySubject(subjectId);

  const handleAssign = () => {
    if (!subjectId || !teacherId) return;
    assignSubjectTeacher.mutate(
      { subject_id: subjectId, teacher_id: teacherId },
      {
        onSuccess: () => {
          setSubjectId("");
          setTeacherId("");
          onClose();
        },
      }
    );
  };

  return (
    <FormModal
      open={open}
      title="Assign class subject teacher"
      onClose={onClose}
      onSubmit={handleAssign}
      isPending={assignSubjectTeacher.isPending}
      submitDisabled={!subjectId || !teacherId}
      submitLabel="Assign"
      isError={assignSubjectTeacher.isError}
      error={assignSubjectTeacher.error}
      errorFallback="Failed to assign subject teacher"
    >
      <div className="os-grid os-gap-4">
        <EntityCombobox
          id="class-subject-choice"
          labelText="Subject"
          items={subjects ?? []}
          selectedId={subjectId}
          onSelect={(id) => {
            setSubjectId(id);
            setTeacherId("");
          }}
          getId={(s) => s.id}
          itemToString={(s) => `${s.name} (${s.code})`}
          placeholder="Search subjects by name or code…"
        />
        <div>
          <EntityCombobox
            id="class-subject-teacher-choice"
            labelText="Teacher"
            items={qualifiedTeachers ?? []}
            selectedId={teacherId}
            onSelect={setTeacherId}
            getId={(t) => t.id}
            itemToString={(t) => `${t.full_name} - ${t.employee_number}`}
            placeholder={subjectId ? "Search qualified teachers…" : "Choose a subject first…"}
            disabled={!subjectId}
          />
          <p className="os-mt-1h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">
            Only teachers qualified for this subject on the{" "}
            <Link to="/teacher-subjects">Teacher subjects</Link> page are shown.
          </p>
        </div>

        {subjectId && !teachersLoading && (qualifiedTeachers?.length ?? 0) === 0 && (
          <InlineNotification
            kind="warning"
            title="No qualified teachers"
            subtitle="No teacher holds this subject as a qualification yet - assign it on the Teacher Subjects page first."
            lowContrast
            hideCloseButton className="os-max-w-full"
          />
        )}
      </div>
    </FormModal>
  );
}
