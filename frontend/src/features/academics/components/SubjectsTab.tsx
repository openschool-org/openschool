import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { useClassSubjectTeachers, useAssignSubjectTeacher } from "@/features/academics/queries/useClasses";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { usePublishedTimetableForClass } from "@/features/timetable/queries/useTimetables";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import SectionHeader from "@/shared/ui/SectionHeader";
import AssignClassSubjectTeacherModal from "@/features/academics/components/AssignClassSubjectTeacherModal";

export default function SubjectsTab({ classId, academicYearId }: { classId: string; academicYearId: string }) {
  const { data: assignments, isLoading } = useClassSubjectTeachers(classId);
  const { data: subjects } = useSubjects();
  const assignSubjectTeacher = useAssignSubjectTeacher(classId);
  const { data: published } = usePublishedTimetableForClass(classId, academicYearId);
  const [modalOpen, setModalOpen] = useState(false);

  // A pairing counts as scheduled once the published timetable has it on the grid.
  const scheduledSubjectIds = new Set(
    (published?.entries ?? []).filter((e) => e.subject_id && e.teacher_id).map((e) => e.subject_id)
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="os-mt-4">
      <div className="os-section">
        <SectionHeader
          title="Subjects & teachers"
          meta={
            <Button renderIcon={UserFollow} size="sm" onClick={() => setModalOpen(true)}>
              Assign subject teacher
            </Button>
          }
        />

        <div className="os-section__body os-p-0">
          {!assignments || assignments.length === 0 ? (
            <div className="os-p-8">
              <EmptyState
                title="No subjects assigned yet"
                description="Assign teachers to subjects to enable mark entry and timetable configuration."
              />
            </div>
          ) : (
            <DataGrid
              rows={assignments}
              getRowId={(a) => a.subject_id}
              pagination={false}
              columns={[
                { key: "subject", header: "Subject", render: (a) => <span className="os-fw-500">{a.subject_name}</span> },
                { key: "code", header: "Subject code", render: (a) => <span className="os-table__mono">{a.subject_code}</span> },
                { key: "teacher", header: "Assigned teacher", render: (a) => a.teacher_name },
                { key: "timetable", header: "Timetable", render: (a) => (scheduledSubjectIds.has(a.subject_id) ? <Tag type="green" size="sm">Scheduled</Tag> : <Tag type="gray" size="sm">Not scheduled</Tag>) },
              ]}
            />
          )}
        </div>
      </div>

      <AssignClassSubjectTeacherModal
        open={modalOpen}
        subjects={subjects}
        assignSubjectTeacher={assignSubjectTeacher}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
