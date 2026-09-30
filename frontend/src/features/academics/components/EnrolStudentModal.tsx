import type { useEnrollStudent } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  enrolCandidates: Student[];
  onStudentSearch: (term: string) => void;
  studentChoice: string;
  onStudentChoiceChange: (id: string) => void;
  enrollStudent: ReturnType<typeof useEnrollStudent>;
  onClose: () => void;
  onEnrol: () => void;
}

export default function EnrolStudentModal({
  open,
  enrolCandidates,
  onStudentSearch,
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
        <p className="os-text-md">
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
          onSearch={onStudentSearch}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
      )}
    </FormModal>
  );
}
