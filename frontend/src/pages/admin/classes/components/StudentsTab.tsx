import { Link } from "react-router";
import { Button, Tag, InlineNotification } from "@carbon/react";
import { Add, UserMultiple } from "@carbon/icons-react";
import type { useClass, useClassStudents, useUnenrollStudent } from "../../../../queries/useClasses";
import type { Student } from "../../../../services/student";
import { getErrorMessage as apiError } from "../../../../lib/errorMessage";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import EmptyState from "../../../../components/common/EmptyState";

interface Props {
  cls: NonNullable<ReturnType<typeof useClass>["data"]>;
  students: ReturnType<typeof useClassStudents>["data"];
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
    <div className="os-section" style={{ marginTop: "1rem" }}>
      <div className="os-section__header">
        <h2 className="os-section__title">Enrolled Students</h2>
        <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenEnrol}>
          Enrol
        </Button>
      </div>

      {/* enrollStudent's error is shown inside EnrolStudentModal, where the
          user is actively enrolling — not duplicated here. */}
      {unenrollStudent.isError && (
        <InlineNotification
          kind="error"
          title="Could not remove student"
          subtitle={apiError(unenrollStudent.error, "Please try again.")}
          lowContrast
          onClose={() => unenrollStudent.reset()}
          style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
        />
      )}

      {studentsLoading ? (
        <LoadingSpinner />
      ) : students && students.length > 0 ? (
        <table className="os-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Index No.</th>
              <th>Gender</th>
              <th style={{ width: "5rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="os-table__mono">{i + 1}</td>
                <td>
                  <Link to={`/students/${s.id}`} className="os-table__link">
                    {s.full_name}
                  </Link>
                  {s.id === cls.girl_monitor_id && (
                    <Tag type="magenta" size="sm" style={{ marginLeft: "0.5rem" }}>
                      Girl Monitor
                    </Tag>
                  )}
                  {s.id === cls.boy_monitor_id && (
                    <Tag type="blue" size="sm" style={{ marginLeft: "0.5rem" }}>
                      Boy Monitor
                    </Tag>
                  )}
                </td>
                <td className="os-table__mono">{s.index_number}</td>
                <td className="os-table__muted">
                  {s.gender ? s.gender[0].toUpperCase() + s.gender.slice(1) : "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <Button kind="danger--ghost" size="sm" onClick={() => onRequestUnenroll(s)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState
          title="No students enrolled"
          description="Enrol a student from this school into the class."
          action={
            <Button renderIcon={Add} kind="primary" onClick={onOpenEnrol}>
              Enrol Student
            </Button>
          }
        />
      )}

      <div
        style={{
          padding: "0.75rem 1.5rem",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8125rem",
          color: "#525252",
        }}
      >
        <UserMultiple size={14} style={{ fill: "#8d8d8d" }} />
        {students?.length ?? 0} enrolled
      </div>
    </div>
  );
}
