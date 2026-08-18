// This file defines the AssignSubjectTeacherModal component, which allows administrators to link a teacher and a subject to a specific class.

import { useState } from "react";
import type { useAssignSubjectTeacher } from "../../../../queries/useClasses";
import type { useTeachers } from "../../../../queries/useTeachers";
import type { useSubjects } from "../../../../queries/useSubjects";
import FormModal from "../../../../components/common/FormModal";
import EntityCombobox from "../../../../components/common/EntityCombobox";

interface Props {
  open: boolean;
  subjects: ReturnType<typeof useSubjects>["data"];
  teachers: ReturnType<typeof useTeachers>["data"];
  assignSubjectTeacher: ReturnType<typeof useAssignSubjectTeacher>;
  onClose: () => void;
}

export default function AssignSubjectTeacherModal({
  open,
  subjects,
  teachers,
  assignSubjectTeacher,
  onClose,
}: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

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
      title="Assign subject teacher"
      onClose={onClose}
      onSubmit={handleAssign}
      isPending={assignSubjectTeacher.isPending}
      submitDisabled={!subjectId || !teacherId}
      submitLabel="Assign"
      isError={assignSubjectTeacher.isError}
      error={assignSubjectTeacher.error}
      errorFallback="Failed to assign subject teacher"
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <EntityCombobox
          id="subject-choice"
          labelText="Subject"
          items={subjects ?? []}
          selectedId={subjectId}
          onSelect={setSubjectId}
          getId={(s) => s.id}
          itemToString={(s) => `${s.name} (${s.code})`}
          placeholder="Search subjects by name or code…"
        />
        <EntityCombobox
          id="teacher-choice-subject"
          labelText="Teacher"
          items={teachers ?? []}
          selectedId={teacherId}
          onSelect={setTeacherId}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
          placeholder="Search teachers by name or employee number…"
        />
      </div>
    </FormModal>
  );
}
