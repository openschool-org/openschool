import type { useEnrollStudent } from "../../../../queries/useClasses";
import type { Student } from "../../../../services/student";
import FormModal from "../../../../components/common/FormModal";
import EntityCombobox from "../../../../components/common/EntityCombobox";

interface Props {
  open: boolean;
  enrolCandidates: Student[];
  studentChoice: string;
  onStudentChoiceChange: (id: string) => void;
  enrollStudent: ReturnType<typeof useEnrollStudent>;
  onClose: () => void;
  onEnrol: () => void;
}

export default function EnrolStudentModal({
  open,
  enrolCandidates,
  studentChoice,
  onStudentChoiceChange,
  enrollStudent,
  onClose,
  onEnrol,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Enrol student"
      onClose={onClose}
      onSubmit={onEnrol}
      isPending={enrollStudent.isPending}
      submitDisabled={!studentChoice}
      submitLabel="Enrol"
      pendingLabel="Enrolling…"
      isError={enrollStudent.isError}
      error={enrollStudent.error}
      errorFallback="Failed to enrol student"
    >
      {enrolCandidates.length === 0 ? (
        <p style={{ fontSize: "0.875rem" }}>
          Every student in the school is already enrolled in this class, or there are no students
          yet.
        </p>
      ) : (
        <EntityCombobox
          id="student-choice"
          labelText="Student"
          items={enrolCandidates}
          selectedId={studentChoice}
          onSelect={onStudentChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} — ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
      )}
    </FormModal>
  );
}
