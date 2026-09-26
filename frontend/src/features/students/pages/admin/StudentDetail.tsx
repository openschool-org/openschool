import { useState } from "react";
import { Link, useParams, useLocation } from "react-router";
import { Button, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save } from "@carbon/icons-react";
import { useStudentWithClass, useUpdateStudentHouse, useUpdateStudentEnrollmentStatus } from "@/features/students/queries/useStudents";
import { useHouses } from "@/features/school/queries/useHouses";
import { useStudentProfileEditor } from "@/features/students/hooks/useStudentProfileEditor";
import StudentProfileTab from "@/features/students/components/StudentProfileTab";
import SubjectEnrollment from "@/features/students/components/SubjectEnrollment";
import StudentGuardians from "@/features/students/components/StudentGuardians";
import StudentProgressReports from "@/features/portfolio/components/StudentProgressReports";
import StudentActivities from "@/features/portfolio/components/StudentActivities";
import StudentLeadershipAwards from "@/features/portfolio/components/StudentLeadershipAwards";
import StudentDisciplinary from "@/features/portfolio/components/StudentDisciplinary";
import StudentRecordsRollup from "@/features/portfolio/components/StudentRecordsRollup";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ProfileBanner from "@/shared/ui/ProfileBanner";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import ConfirmEditModal from "@/shared/ui/ConfirmEditModal";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export default function StudentDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { data: student, isLoading, isError, refetch } = useStudentWithClass(id);
  usePageTitle(student?.full_name);
  const { data: houses } = useHouses();
  const updateHouse = useUpdateStudentHouse();
  const updateStatus = useUpdateStudentEnrollmentStatus();
  const editor = useStudentProfileEditor(id, student, (location.state as { edit?: boolean } | null)?.edit ?? false);
  const unsavedGuard = useUnsavedChangesGuard(editor.hasUnsaved);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !student) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load student" onRetry={refetch} />
      </div>
    );
  }

  const pending = editor.updateStudent.isPending;

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <ProfileBanner
        name={student.full_name}
        meta={student.index_number + (student.class_name ? ` · ${student.class_name}` : "")}
        actions={
          editor.editing ? (
            <>
              <Button kind="secondary" size="sm" onClick={() => unsavedGuard.guard(editor.cancel)} disabled={pending}>Cancel</Button>
              <Button renderIcon={Save} kind="primary" size="sm" onClick={() => setConfirmSave(true)} disabled={!editor.isValid || pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button renderIcon={Edit} kind="ghost" size="sm" onClick={editor.startEdit}>Edit</Button>
              <Button renderIcon={TrashCan} kind="danger--ghost" size="sm" onClick={() => setConfirmDelete(true)}>Delete</Button>
              <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/students">Back</Button>
            </>
          )
        }
      />

      <div className="os-py-6 os-px-8">
        <Tabs>
          <TabList aria-label="Student sections">
            <Tab>Profile</Tab>
            <Tab>Guardians</Tab>
            <Tab>Subject enrolment</Tab>
            <Tab>Progress reports</Tab>
            <Tab>Activities</Tab>
            <Tab>Leadership &amp; awards</Tab>
            <Tab>Disciplinary</Tab>
            <Tab>Records</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="os-p-0">
              <StudentProfileTab
                student={student}
                form={editor.form}
                editing={editor.editing}
                onChange={editor.change}
                onGenderChange={(value) => editor.change("gender", value)}
                updateError={editor.updateError}
                houses={houses}
                updateHouse={updateHouse}
                updateStatus={updateStatus}
              />
            </TabPanel>
            <TabPanel className="os-p-0"><div className="os-mt-4"><StudentGuardians studentId={student.id} /></div></TabPanel>
            <TabPanel className="os-p-0"><div className="os-mt-4"><SubjectEnrollment studentId={student.id} /></div></TabPanel>
            <TabPanel className="os-p-0"><StudentProgressReports studentId={student.id} /></TabPanel>
            <TabPanel className="os-p-0"><StudentActivities studentId={student.id} /></TabPanel>
            <TabPanel className="os-p-0"><StudentLeadershipAwards studentId={student.id} /></TabPanel>
            <TabPanel className="os-p-0"><StudentDisciplinary studentId={student.id} /></TabPanel>
            <TabPanel className="os-p-0"><StudentRecordsRollup studentId={student.id} /></TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete student"
        description={<>Delete <strong>{student.full_name}</strong>? This removes their account and cannot be undone.</>}
        subject="Student"
        mutation={editor.deleteStudent}
        onClose={() => setConfirmDelete(false)}
        onConfirm={editor.remove}
        onSuccess={editor.goToStudents}
      />
      <ConfirmEditModal
        open={confirmSave}
        title="Save changes"
        description={<>Save these changes to <strong>{student.full_name}</strong>'s profile?</>}
        isPending={pending}
        onClose={() => setConfirmSave(false)}
        onConfirm={() => editor.save(() => setConfirmSave(false))}
      />
      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
