import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import { Button } from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save } from "@carbon/icons-react";
import {
  useTeacher,
  useTeacherSubjects,
  useDeleteTeacher,
  useUpdateTeacher,
  useUpdateTeacherHouse,
  useUpdateTeacherEmploymentStatus,
  useAssignTeacherSubject,
  useRemoveTeacherSubject,
} from "@/features/teachers/queries/useTeachers";
import { useHouses } from "@/features/school/queries/useHouses";
import { getErrorMessage } from "@/shared/api/errors";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ProfileBanner from "@/shared/ui/ProfileBanner";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import ConfirmEditModal from "@/shared/ui/ConfirmEditModal";
import type { Teacher, TeacherTitle } from "@/features/teachers/api/teacher";
import { splitFullName } from "@/shared/lib/name";
import { EMPLOYMENT_STATUSES } from "@/features/teachers/constants";
import TeacherProfileSections from "@/features/teachers/components/TeacherProfileSections";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

function teacherToForm(t: Teacher) {
  return {
    ...splitFullName(t.full_name),
    phone_number: t.phone ?? "",
    nic_number: t.nic_number ?? "",
    title: t.title ?? ("" as TeacherTitle | ""),
    gender: t.gender ?? ("" as "" | "male" | "female"),
  };
}

export default function TeacherDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teacher, isLoading, isError, refetch } = useTeacher(id);
  usePageTitle(teacher?.full_name);
  const { data: subjects } = useTeacherSubjects(id);
  const deleteTeacher = useDeleteTeacher();
  const updateTeacher = useUpdateTeacher();
  const updateHouse = useUpdateTeacherHouse();
  const updateStatus = useUpdateTeacherEmploymentStatus();
  const assignSubject = useAssignTeacherSubject(id);
  const removeSubject = useRemoveTeacherSubject(id);
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
    nic_number: "",
    title: "" as TeacherTitle | "",
    gender: "" as "" | "male" | "female",
  });

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (teacher && loadedFor !== teacher.id) {
    setForm(teacherToForm(teacher));
    setLoadedFor(teacher.id);
  }

  const handleDelete = () => {
    deleteTeacher.mutate(id);
  };

  const handleCancel = () => {
    if (teacher) setForm(teacherToForm(teacher));
    updateTeacher.reset();
    setEditing(false);
  };

  const handleSave = () => {
    updateTeacher.mutate(
      {
        id,
        data: {
          given_name: form.given_name.trim(),
          family_name: form.family_name.trim(),
          phone_number: form.phone_number.trim() || undefined,
          nic_number: form.nic_number.trim(),
          title: form.title || undefined,
          gender: form.gender || undefined,
        },
      },
      { onSuccess: () => { setEditing(false); setConfirmEditOpen(false); } },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateTeacher.isError
    ? getErrorMessage(updateTeacher.error, "Failed to update teacher")
    : null;

  const isValid =
    form.given_name.trim() && form.family_name.trim() && form.nic_number.trim();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !teacher)
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load teacher" onRetry={refetch} />
      </div>
    );

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <ProfileBanner
        name={teacher.full_name}
        meta={
          teacher.employment_status === "active"
            ? teacher.employee_number
            : `${teacher.employee_number} · ${EMPLOYMENT_STATUSES.find((s) => s.value === teacher.employment_status)?.label}`
        }
        actions={
          editing ? (
            <>
              <Button
                kind="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={updateTeacher.isPending}
              >
                Cancel
              </Button>
              <Button
                renderIcon={Save}
                kind="primary"
                size="sm"
                onClick={() => setConfirmEditOpen(true)}
                disabled={!isValid || updateTeacher.isPending}
              >
                {updateTeacher.isPending ? "Saving…" : "Save changes"}
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
                onClick={() => {
                  deleteTeacher.reset();
                  setConfirmOpen(true);
                }}
              >
                Delete
              </Button>
              <Button
                renderIcon={ArrowLeft}
                kind="secondary"
                size="sm"
                as={Link}
                to="/teachers"
              >
                Back
              </Button>
            </>
          )
        }
      />

      <div className="os-py-6 os-px-8">
        <MutationErrorNotification
          isError={deleteTeacher.isError}
          error={deleteTeacher.error}
          title="Could not delete teacher"
          fallback="The teacher may be assigned to a class or have attendance records."
          onClose={() => deleteTeacher.reset()} className="os-mb-4"
        />

        <TeacherProfileSections
          teacher={teacher}
          subjects={subjects}
          houses={houses}
          form={form}
          editing={editing}
          onChange={change}
          onTitleChange={(value) => setForm((f) => ({ ...f, title: value }))}
          onGenderChange={(value) => setForm((f) => ({ ...f, gender: value }))}
          updateError={updateError}
          updateHouse={updateHouse}
          updateStatus={updateStatus}
          assignSubject={assignSubject}
          removeSubject={removeSubject}
        />
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        title="Delete teacher"
        description={
          <>
            Delete <strong>{teacher.full_name}</strong>? This removes their
            account and cannot be undone.
          </>
        }
        subject="Teacher"
        mutation={deleteTeacher}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        onSuccess={() => navigate("/teachers")}
      />

      <ConfirmEditModal
        open={confirmEditOpen}
        title="Save changes"
        description={<>Save these changes to <strong>{teacher.full_name}</strong>&apos;s profile?</>}
        isPending={updateTeacher.isPending}
        onClose={() => setConfirmEditOpen(false)}
        onConfirm={handleSave}
      />
    </div>
  );
}
