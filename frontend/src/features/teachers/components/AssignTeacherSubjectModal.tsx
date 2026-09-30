import { useState } from "react";
import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { useAssignTeacherSubject } from "@/features/teachers/queries/useTeachers";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import FormModal from "@/shared/ui/FormModal";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  teacher: Teacher;
  subjects: Subject[];
  mutation: ReturnType<typeof useAssignTeacherSubject>;
  onClose: () => void;
}

export default function AssignTeacherSubjectModal({ open, teacher, subjects, mutation, onClose }: Props) {
  const [subjectId, setSubjectId] = useState("");
  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  const close = (force = false) => {
    if (mutation.isPending && !force) return;
    setSubjectId("");
    mutation.reset();
    onClose();
  };

  const assign = () => {
    if (!subjectId) return;
    mutation.mutate(subjectId, { onSuccess: () => close(true) });
  };

  return (
    <FormModal
      open={open}
      title={`Assign subject to ${displayName(teacher)}`}
      onClose={close}
      onSubmit={assign}
      isPending={mutation.isPending}
      submitDisabled={!subjectId}
      submitLabel="Assign subject"
      pendingLabel="Assigning…"
      isError={mutation.isError}
      error={mutation.error}
      errorFallback="Could not assign this subject. Please try again."
    >
      <EntityCombobox
        id={`assign-subject-${teacher.id}`}
        items={subjects}
        selectedId={subjectId}
        onSelect={setSubjectId}
        getId={(subject) => subject.id}
        itemToString={(subject) => `${subject.name} (${subject.code})`}
        labelText="Subject"
        placeholder="Search by subject name or code…"
      />
      {selectedSubject && (
        <p className="os-mt-2 os-mb-0 os-text-xs os-c-secondary">
          This subject will be added to {displayName(teacher)}&apos;s qualifications.
        </p>
      )}
    </FormModal>
  );
}
