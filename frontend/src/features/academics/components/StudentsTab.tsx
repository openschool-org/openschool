import { Link } from "react-router";
import { Button, Tag } from "@carbon/react";
import { Add, UserMultiple } from "@carbon/icons-react";
import type { useClass, useUnenrollStudent } from "@/features/academics/queries/useClasses";
import type { useStudentsByClass } from "@/features/students/queries/useStudents";
import type { Student } from "@/features/students/api/student";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import { capitalize } from "@/shared/lib/text";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";

interface Props {
  cls: NonNullable<ReturnType<typeof useClass>["data"]>;
  students: ReturnType<typeof useStudentsByClass>["data"];
  studentsLoading: boolean;
  unenrollStudent: ReturnType<typeof useUnenrollStudent>;
  onOpenEnrol: () => void;
  onRequestUnenroll: (student: Student) => void;
}

export default function StudentsTab({
  cls,
  students,
  studentsLoading,
  unenrollStudent,
  onOpenEnrol,
  onRequestUnenroll,
}: Props) {
  return (
    <div className="os-section os-mt-4">
      <SectionHeader
        title="Enrolled students"
        meta={
          <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenEnrol}>
            Enrol
          </Button>
        }
      />

      <MutationErrorNotification
        isError={unenrollStudent.isError}
        error={unenrollStudent.error}
        title="Could not remove student"
        fallback="Please try again."
        onClose={() => unenrollStudent.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />

      {studentsLoading ? (
        <LoadingSpinner />
      ) : students && students.length > 0 ? (
        <DataGrid
          rows={students}
          getRowId={(s) => s.id}
          pageSize={20}
          columns={[
            { key: "n", header: "#", render: (s) => <span className="os-table__mono">{students.indexOf(s) + 1}</span> },
            {
              key: "name",
              header: "Name",
              render: (s) => (
                <>
                  <Link to={`/students/${s.id}`} className="os-table__link">{s.full_name}</Link>
                  {s.id === cls.girl_monitor_id && <Tag type="magenta" size="sm" className="os-ml-2">Girl monitor</Tag>}
                  {s.id === cls.boy_monitor_id && <Tag type="blue" size="sm" className="os-ml-2">Boy monitor</Tag>}
                </>
              ),
            },
            { key: "index", header: "Index no.", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
            { key: "gender", header: "Gender", render: (s) => <span className="os-table__muted">{capitalize(s.gender)}</span> },
            { key: "actions", header: "Actions", align: "end", render: (s) => <Button kind="danger--ghost" size="sm" onClick={() => onRequestUnenroll(s)}>Remove</Button> },
          ]}
        />
      ) : (
        <EmptyState
          title="No students enrolled"
          description="Enrol a student from this school into the class."
          action={
            <Button renderIcon={Add} kind="primary" onClick={onOpenEnrol}>
              Enrol student
            </Button>
          }
        />
      )}

      <div className="os-py-3 os-px-6 os-border-t os-flex os-items-center os-gap-2 os-text-sm os-c-secondary"
      >
        <UserMultiple size={14} className="os-fill-tertiary" />
        {students?.length ?? 0} enrolled
      </div>
    </div>
  );
}
