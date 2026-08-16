import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import { Button, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save } from "@carbon/icons-react";
import {
  useStudentWithClass,
  useUpdateStudent,
  useUpdateStudentHouse,
  useUpdateStudentEnrollmentStatus,
  useDeleteStudent,
} from "../../../queries/useStudents";
import { useHouses } from "../../../queries/useHouses";
import type { StudentWithClass } from "../../../services/student";
import { getErrorMessage } from "../../../lib/errorMessage";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ProfileBanner from "../../../components/common/ProfileBanner";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import ConfirmEditModal from "../../../components/common/ConfirmEditModal";
import SubjectEnrollment from "./SubjectEnrollment";
import StudentGuardians from "./StudentGuardians";
import StudentProgressReports from "./StudentProgressReports";
import StudentActivities from "./StudentActivities";
import StudentLeadershipAwards from "./StudentLeadershipAwards";
import StudentDisciplinary from "./StudentDisciplinary";
import StudentRecordsRollup from "./StudentRecordsRollup";
import StudentProfileTab, { type StudentProfileForm } from "./components/StudentProfileTab";
import { splitFullName } from "../../../lib/name";

type Gender = "" | "male" | "female";

function studentToForm(s: StudentWithClass): StudentProfileForm {
  return {
    ...splitFullName(s.full_name),
    phone_number: s.phone ?? "",
    address: s.address ?? "",
    whatsapp: s.whatsapp ?? "",
    special_remarks: s.special_remarks ?? "",
    gender: (s.gender ?? "") as Gender,
  };
}

export default function StudentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: student, isLoading, isError, refetch } =
    useStudentWithClass(id);
  const updateStudent = useUpdateStudent();
  const updateHouse = useUpdateStudentHouse();
  const updateStatus = useUpdateStudentEnrollmentStatus();
  const deleteStudent = useDeleteStudent();
  const { data: houses } = useHouses();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [editing, setEditing] = useState(
    (location.state as { edit?: boolean } | null)?.edit ?? false,
  );
  const [form, setForm] = useState({
    given_name: "",
    family_name: "",
    phone_number: "",
    address: "",
    whatsapp: "",
    special_remarks: "",
    gender: "" as Gender,
  });

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (student && loadedFor !== student.id) {
    setForm(studentToForm(student));
    setLoadedFor(student.id);
  }

  const handleDelete = () => {
    deleteStudent.mutate(id, {
      onSuccess: () => navigate("/students"),
      onSettled: () => setConfirmOpen(false),
    });
  };

  const handleCancel = () => {
    if (student) setForm(studentToForm(student));
    updateStudent.reset();
    setEditing(false);
  };

  const handleSave = () => {
    updateStudent.mutate(
      {
        id,
        data: {
          given_name: form.given_name.trim(),
          family_name: form.family_name.trim(),
          phone_number: form.phone_number.trim() || undefined,
          address: form.address.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          special_remarks: form.special_remarks.trim() || undefined,
          gender: form.gender || undefined,
        },
      },
      { onSuccess: () => { setEditing(false); setConfirmEditOpen(false); } },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateStudent.isError
    ? getErrorMessage(updateStudent.error, "Failed to update student")
    : null;

  const isValid = form.given_name.trim() && form.family_name.trim();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !student)
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load student" onRetry={refetch} />
      </div>
    );

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <ProfileBanner
        name={student.full_name}
        meta={
          student.index_number +
          (student.class_name ? ` · ${student.class_name}` : "")
        }
        actions={
          editing ? (
            <>
              <Button
                kind="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={updateStudent.isPending}
              >
                Cancel
              </Button>
              <Button
                renderIcon={Save}
                kind="primary"
                size="sm"
                onClick={() => setConfirmEditOpen(true)}
                disabled={!isValid || updateStudent.isPending}
              >
                {updateStudent.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                renderIcon={Edit}
                kind="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                renderIcon={TrashCan}
                kind="danger--ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button
                renderIcon={ArrowLeft}
                kind="secondary"
                size="sm"
                as={Link}
                to="/students"
              >
                Back
              </Button>
            </>
          )
        }
      />

      <div style={{ padding: "1.5rem 2rem" }}>
        <Tabs>
          <TabList aria-label="Student sections">
            <Tab>Profile</Tab>
            <Tab>Guardians</Tab>
            <Tab>Subject Enrollment</Tab>
            <Tab>Progress Reports</Tab>
            <Tab>Activities</Tab>
            <Tab>Leadership &amp; Awards</Tab>
            <Tab>Disciplinary</Tab>
            <Tab>Records</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <StudentProfileTab
                student={student}
                form={form}
                editing={editing}
                onChange={change}
                onGenderChange={(value) => setForm((f) => ({ ...f, gender: value }))}
                updateError={updateError}
                houses={houses}
                updateHouse={updateHouse}
                updateStatus={updateStatus}
              />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div style={{ marginTop: "1rem" }}>
                <StudentGuardians studentId={student.id} />
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <div style={{ marginTop: "1rem" }}>
                <SubjectEnrollment studentId={student.id} />
              </div>
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StudentProgressReports studentId={student.id} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StudentActivities studentId={student.id} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StudentLeadershipAwards studentId={student.id} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StudentDisciplinary studentId={student.id} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StudentRecordsRollup studentId={student.id} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        title="Delete student"
        description={
          <>
            Delete <strong>{student.full_name}</strong>? This removes their
            account and cannot be undone.
          </>
        }
        isPending={deleteStudent.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <ConfirmEditModal
        open={confirmEditOpen}
        title="Save changes"
        description={<>Save these changes to <strong>{student.full_name}</strong>&apos;s profile?</>}
        isPending={updateStudent.isPending}
        onClose={() => setConfirmEditOpen(false)}
        onConfirm={handleSave}
      />
    </div>
  );
}
