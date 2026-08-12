import type { useAssignFormTeacher } from "../../../../queries/useClasses";
import type { useTeachers } from "../../../../queries/useTeachers";
import FormModal from "../../../../components/common/FormModal";
import EntityCombobox from "../../../../components/common/EntityCombobox";

interface Props {
  open: boolean;
  teachers: ReturnType<typeof useTeachers>["data"];
  teacherChoice: string;
  onTeacherChoiceChange: (id: string) => void;
  assignFormTeacher: ReturnType<typeof useAssignFormTeacher>;
  onClose: () => void;
  onAssign: () => void;
}

export default function AssignTeacherModal({
  open,
  teachers,
  teacherChoice,
  onTeacherChoiceChange,
  assignFormTeacher,
  onClose,
  onAssign,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Assign class teacher"
      onClose={onClose}
      onSubmit={onAssign}
      isPending={assignFormTeacher.isPending}
      submitDisabled={!teacherChoice}
      submitLabel="Assign"
      isError={assignFormTeacher.isError}
      error={assignFormTeacher.error}
      errorFallback="Failed to assign teacher"
    >
      <EntityCombobox
        id="teacher-choice"
        labelText="Teacher"
        items={teachers ?? []}
        selectedId={teacherChoice}
        onSelect={onTeacherChoiceChange}
        getId={(t) => t.id}
        itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
        placeholder="Search teachers by name or employee number…"
      />
    </FormModal>
  );
}
