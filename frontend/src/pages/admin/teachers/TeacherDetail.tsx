import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import {
  Button,
  Tag,
  TextInput,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save, Book } from "@carbon/icons-react";
import { AxiosError } from "axios";
import {
  useTeacher,
  useTeacherSubjects,
  useDeleteTeacher,
  useUpdateTeacher,
} from "../../../queries/useTeachers";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ProfileBanner from "../../../components/common/ProfileBanner";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import type { Teacher } from "../../../services/teacher";

function teacherToForm(t: Teacher) {
  const [given, ...rest] = t.full_name.trim().split(/\s+/);
  return {
    given_name: given ?? "",
    family_name: rest.join(" "),
    phone_number: t.phone ?? "",
    employee_number: t.employee_number,
  };
}

export default function TeacherDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teacher, isLoading, isError, refetch } = useTeacher(id);
  const { data: subjects } = useTeacherSubjects(id);
  const deleteTeacher = useDeleteTeacher();
  const updateTeacher = useUpdateTeacher();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(
    (location.state as { edit?: boolean } | null)?.edit ?? false,
  );
  const [form, setForm] = useState({
    given_name: "",
    family_name: "",
    phone_number: "",
    employee_number: "",
  });

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (teacher && loadedFor !== teacher.id) {
    setForm(teacherToForm(teacher));
    setLoadedFor(teacher.id);
  }

  const handleDelete = () => {
    deleteTeacher.mutate(id, {
      onSuccess: () => navigate("/teachers"),
      onSettled: () => setConfirmOpen(false),
    });
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
          employee_number: form.employee_number.trim(),
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateTeacher.isError
    ? (updateTeacher.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to update teacher"
    : null;

  const isValid =
    form.given_name.trim() &&
    form.family_name.trim() &&
    form.employee_number.trim();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !teacher)
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load teacher" onRetry={refetch} />
      </div>
    );

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <ProfileBanner
        name={teacher.full_name}
        meta={teacher.employee_number}
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
                onClick={handleSave}
                disabled={!isValid || updateTeacher.isPending}
              >
                {updateTeacher.isPending ? "Saving…" : "Save Changes"}
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

      <div style={{ padding: "1.5rem 2rem" }}>
        {deleteTeacher.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete teacher"
            subtitle={
              (deleteTeacher.error as AxiosError<{ error: string }>).response?.data
                ?.error ?? "The teacher may be assigned to a class or have attendance records."
            }
            lowContrast
            onClose={() => deleteTeacher.reset()}
            style={{ maxWidth: "100%", marginBottom: "1rem" }}
          />
        )}

        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Profile</h2>
          </div>
          <div className="os-section__body">
            {updateError && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={updateError}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
              }}
            >
              <TextInput
                id="given-name"
                labelText="First Name"
                value={form.given_name}
                readOnly={!editing}
                onChange={(e) => change("given_name", e.target.value)}
              />
              <TextInput
                id="family-name"
                labelText="Last Name"
                value={form.family_name}
                readOnly={!editing}
                onChange={(e) => change("family_name", e.target.value)}
              />
              <TextInput
                id="employee-number"
                labelText="Employee Number"
                value={form.employee_number}
                readOnly={!editing}
                onChange={(e) => change("employee_number", e.target.value)}
              />
              <TextInput
                id="phone"
                labelText="Phone"
                value={form.phone_number}
                readOnly={!editing}
                onChange={(e) => change("phone_number", e.target.value)}
              />
              <TextInput
                id="joined-date"
                labelText="Joined Date"
                value={teacher.joined_date ?? "—"}
                readOnly
              />
              <TextInput
                id="created-at"
                labelText="Created"
                value={
                  teacher.created_at
                    ? new Date(teacher.created_at).toLocaleDateString()
                    : "—"
                }
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Subjects</h2>
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {subjects?.length ?? 0} assigned
            </span>
          </div>
          <div
            className="os-section__body"
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
          >
            {subjects && subjects.length > 0 ? (
              subjects.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.875rem",
                    border: "1px solid #e0e0e0",
                    background: "#f4f4f4",
                  }}
                >
                  <Book size={14} style={{ fill: "#406AAF" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    {s.name}
                  </span>
                  <Tag type="blue" size="sm">
                    {s.code}
                  </Tag>
                </div>
              ))
            ) : (
              <span style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
                No subjects assigned.
              </span>
            )}
          </div>
        </div>
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
        isPending={deleteTeacher.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
