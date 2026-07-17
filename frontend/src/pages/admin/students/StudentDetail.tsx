import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import {
  Button,
  Tag,
  TextInput,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save } from "@carbon/icons-react";
import { AxiosError } from "axios";
import {
  useStudentWithClass,
  useUpdateStudent,
  useDeleteStudent,
} from "../../../queries/useStudents";
import type { StudentWithClass } from "../../../services/student";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ProfileBanner from "../../../components/common/ProfileBanner";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

type Gender = "" | "male" | "female";

function studentToForm(s: StudentWithClass) {
  const [given, ...rest] = s.full_name.trim().split(/\s+/);
  return {
    given_name: given ?? "",
    family_name: rest.join(" "),
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
  const deleteStudent = useDeleteStudent();

  const [confirmOpen, setConfirmOpen] = useState(false);
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
      { onSuccess: () => setEditing(false) },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateStudent.isError
    ? (updateStudent.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to update student"
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
                onClick={handleSave}
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
                id="index-number"
                labelText="Index Number"
                value={student.index_number}
                readOnly
              />
              <TextInput
                id="phone"
                labelText="Phone"
                value={form.phone_number}
                readOnly={!editing}
                onChange={(e) => change("phone_number", e.target.value)}
              />
              <TextInput
                id="whatsapp"
                labelText="WhatsApp"
                value={form.whatsapp}
                readOnly={!editing}
                onChange={(e) => change("whatsapp", e.target.value)}
              />
              <TextInput
                id="address"
                labelText="Address"
                value={form.address}
                readOnly={!editing}
                onChange={(e) => change("address", e.target.value)}
              />
              {editing ? (
                <RadioButtonGroup
                  legendText="Gender"
                  name="gender"
                  valueSelected={form.gender}
                  onChange={(value) =>
                    setForm((f) => ({ ...f, gender: value as Gender }))
                  }
                >
                  <RadioButton id="gender-male" labelText="Male" value="male" />
                  <RadioButton id="gender-female" labelText="Female" value="female" />
                </RadioButtonGroup>
              ) : (
                <TextInput
                  id="gender"
                  labelText="Gender"
                  value={
                    form.gender
                      ? form.gender[0].toUpperCase() + form.gender.slice(1)
                      : "—"
                  }
                  readOnly
                />
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <TextArea
                  id="special-remarks"
                  labelText="Special Remarks"
                  rows={3}
                  value={form.special_remarks}
                  readOnly={!editing}
                  onChange={(e) => change("special_remarks", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Current Class</h2>
          </div>
          <div className="os-section__body">
            {student.class_name ? (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Tag type="blue" size="sm">
                  {student.class_name}
                </Tag>
                {student.grade_name && (
                  <Tag type="gray" size="sm">
                    {student.grade_name}
                  </Tag>
                )}
                {student.academic_year && (
                  <Tag type="cool-gray" size="sm">
                    {student.academic_year}
                  </Tag>
                )}
              </div>
            ) : (
              <span style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
                Not enrolled in a class.
              </span>
            )}
          </div>
        </div>
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
    </div>
  );
}
