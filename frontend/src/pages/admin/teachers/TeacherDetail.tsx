import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import {
  Button,
  Tag,
  TextInput,
  Select,
  SelectItem,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save, Book } from "@carbon/icons-react";
import {
  useTeacher,
  useTeacherSubjects,
  useDeleteTeacher,
  useUpdateTeacher,
  useUpdateTeacherHouse,
  useUpdateTeacherEmploymentStatus,
} from "../../../queries/useTeachers";
import { useHouses } from "../../../queries/useHouses";
import { getErrorMessage } from "../../../lib/errorMessage";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ProfileBanner from "../../../components/common/ProfileBanner";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import type { Teacher, TeacherTitle, TeacherEmploymentStatus } from "../../../services/teacher";

const TITLES: TeacherTitle[] = ["Mr", "Miss", "Mrs", "Ms", "Dr", "Von", "Prof"];

const EMPLOYMENT_STATUSES: { value: TeacherEmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "transferred", label: "Transferred" },
];

function teacherToForm(t: Teacher) {
  const [given, ...rest] = t.full_name.trim().split(/\s+/);
  return {
    given_name: given ?? "",
    family_name: rest.join(" "),
    phone_number: t.phone ?? "",
    employee_number: t.employee_number,
    title: t.title ?? ("" as TeacherTitle | ""),
    gender: t.gender ?? ("" as "" | "male" | "female"),
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
  const updateHouse = useUpdateTeacherHouse();
  const updateStatus = useUpdateTeacherEmploymentStatus();
  const { data: houses } = useHouses();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(
    (location.state as { edit?: boolean } | null)?.edit ?? false,
  );
  const [form, setForm] = useState({
    given_name: "",
    family_name: "",
    phone_number: "",
    employee_number: "",
    title: "" as TeacherTitle | "",
    gender: "" as "" | "male" | "female",
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
          title: form.title || undefined,
          gender: form.gender || undefined,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateTeacher.isError
    ? getErrorMessage(updateTeacher.error, "Failed to update teacher")
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
            subtitle={getErrorMessage(
              deleteTeacher.error,
              "The teacher may be assigned to a class or have attendance records.",
            )}
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
              <Select
                id="title"
                labelText="Title"
                value={form.title}
                disabled={!editing}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value as TeacherTitle | "" }))}
              >
                <SelectItem value="" text="None" />
                {TITLES.map((t) => (
                  <SelectItem key={t} value={t} text={t} />
                ))}
              </Select>
              <div>
                <RadioButtonGroup
                  legendText="Gender"
                  name="gender"
                  valueSelected={form.gender}
                  disabled={!editing}
                  onChange={(value) => setForm((f) => ({ ...f, gender: value as "male" | "female" }))}
                >
                  <RadioButton id="edit-gender-male" labelText="Male" value="male" />
                  <RadioButton id="edit-gender-female" labelText="Female" value="female" />
                </RadioButtonGroup>
              </div>
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
                value={teacher.joined_date ?? "-"}
                readOnly
              />
              <TextInput
                id="created-at"
                labelText="Created"
                value={
                  teacher.created_at
                    ? new Date(teacher.created_at).toLocaleDateString()
                    : "-"
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

        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">House</h2>
          </div>
          <div className="os-section__body">
            {(() => {
              const current = houses?.find((h) => h.id === teacher.house_id);
              return current ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "0.75rem",
                      height: "0.75rem",
                      borderRadius: "50%",
                      backgroundColor: current.color,
                    }}
                  />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{current.name}</span>
                </div>
              ) : null;
            })()}
            <Select
              id="teacher-house"
              labelText="Assigned house"
              helperText="Assigned automatically to keep houses balanced. Only a System Administrator can change it — every change is recorded in the audit log."
              value={teacher.house_id ?? ""}
              disabled={updateHouse.isPending}
              onChange={(e) =>
                updateHouse.mutate({ id: teacher.id, houseId: e.target.value })
              }
            >
              <SelectItem value="" text="No house" />
              {houses?.map((h) => (
                <SelectItem key={h.id} value={h.id} text={h.name} />
              ))}
            </Select>
          </div>
        </div>

        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Employment Status</h2>
          </div>
          <div className="os-section__body">
            <Select
              id="teacher-employment-status"
              labelText="Status"
              helperText="Mark resigned or transferred when a teacher leaves the school."
              value={teacher.employment_status}
              disabled={updateStatus.isPending}
              onChange={(e) =>
                updateStatus.mutate({ id: teacher.id, status: e.target.value as TeacherEmploymentStatus })
              }
            >
              {EMPLOYMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} text={s.label} />
              ))}
            </Select>
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
