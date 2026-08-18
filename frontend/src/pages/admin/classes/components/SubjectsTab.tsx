// This file defines the SubjectsTab component, which lists all subjects and their assigned teachers for a given class.

import { useState } from "react";
import { Button } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { useClassSubjectTeachers, useAssignSubjectTeacher } from "../../../../queries/useClasses";
import { useTeachers } from "../../../../queries/useTeachers";
import { useSubjects } from "../../../../queries/useSubjects";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import EmptyState from "../../../../components/common/EmptyState";
import AssignSubjectTeacherModal from "./AssignSubjectTeacherModal";

export default function SubjectsTab({ classId }: { classId: string }) {
  const { data: assignments, isLoading } = useClassSubjectTeachers(classId);
  const { data: subjects } = useSubjects();
  const { data: teachers } = useTeachers();
  const assignSubjectTeacher = useAssignSubjectTeacher(classId);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Subjects & Teachers</h2>
          <Button
            renderIcon={UserFollow}
            size="sm"
            onClick={() => setModalOpen(true)}
            style={{ marginLeft: "auto" }}
          >
            Assign Subject Teacher
          </Button>
        </div>

        <div className="os-section__body" style={{ padding: 0 }}>
          {!assignments || assignments.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <EmptyState
                title="No subjects assigned yet"
                description="Assign teachers to subjects to enable mark entry and timetable configuration."
              />
            </div>
          ) : (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Subject Code</th>
                  <th>Assigned Teacher</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.subject_id}>
                    <td style={{ fontWeight: 500 }}>{a.subject_name}</td>
                    <td className="os-table__mono">{a.subject_code}</td>
                    <td>{a.teacher_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AssignSubjectTeacherModal
        open={modalOpen}
        subjects={subjects}
        teachers={teachers}
        assignSubjectTeacher={assignSubjectTeacher}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
