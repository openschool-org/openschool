import { Tag, TextInput, Select, SelectItem, RadioButtonGroup, RadioButton, InlineNotification } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import type { Teacher, TeacherTitle, TeacherEmploymentStatus, TeacherSubject } from "../../../../services/teacher";
import type { House } from "../../../../services/house";
import type { UseMutationResult } from "@tanstack/react-query";
import { TITLES, EMPLOYMENT_STATUSES } from "../constants";

export type TeacherProfileForm = {
  given_name: string;
  family_name: string;
  phone_number: string;
  nic_number: string;
  title: TeacherTitle | "";
  gender: "" | "male" | "female";
};

export default function TeacherProfileSections({
  teacher,
  subjects,
  houses,
  form,
  editing,
  onChange,
  onTitleChange,
  onGenderChange,
  updateError,
  updateHouse,
  updateStatus,
}: {
  teacher: Teacher;
  subjects: TeacherSubject[] | undefined;
  houses: House[] | undefined;
  form: TeacherProfileForm;
  editing: boolean;
  onChange: (field: keyof TeacherProfileForm, value: string) => void;
  onTitleChange: (value: TeacherTitle | "") => void;
  onGenderChange: (value: "male" | "female") => void;
  updateError: string | null;
  updateHouse: UseMutationResult<unknown, unknown, { id: string; houseId: string }>;
  updateStatus: UseMutationResult<unknown, unknown, { id: string; status: TeacherEmploymentStatus }>;
}) {
  const currentHouse = houses?.find((h) => h.id === teacher.house_id);

  return (
    <>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <Select
              id="title"
              labelText="Title"
              value={form.title}
              disabled={!editing}
              onChange={(e) => onTitleChange(e.target.value as TeacherTitle | "")}
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
                onChange={(value) => onGenderChange(value as "male" | "female")}
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
              onChange={(e) => onChange("given_name", e.target.value)}
            />
            <TextInput
              id="family-name"
              labelText="Last Name"
              value={form.family_name}
              readOnly={!editing}
              onChange={(e) => onChange("family_name", e.target.value)}
            />
            <TextInput id="employee-number" labelText="Employee Number" value={teacher.employee_number} readOnly />
            <TextInput
              id="phone"
              labelText="Phone"
              value={form.phone_number}
              readOnly={!editing}
              onChange={(e) => onChange("phone_number", e.target.value)}
            />
            <TextInput
              id="nic-number"
              labelText="NIC Number"
              value={form.nic_number}
              readOnly={!editing}
              onChange={(e) => onChange("nic_number", e.target.value)}
            />
            <TextInput id="joined-date" labelText="Joined Date" value={teacher.joined_date ?? "-"} readOnly />
            <TextInput
              id="created-at"
              labelText="Created"
              value={teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : "-"}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Subjects</h2>
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{subjects?.length ?? 0} assigned</span>
        </div>
        <div className="os-section__body" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{s.name}</span>
                <Tag type="blue" size="sm">
                  {s.code}
                </Tag>
              </div>
            ))
          ) : (
            <span style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>No subjects assigned.</span>
          )}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">House</h2>
        </div>
        <div className="os-section__body">
          {currentHouse && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "0.75rem",
                  height: "0.75rem",
                  borderRadius: "50%",
                  backgroundColor: currentHouse.color,
                }}
              />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{currentHouse.name}</span>
            </div>
          )}
          <Select
            id="teacher-house"
            labelText="Assigned house"
            helperText="Assigned automatically to keep houses balanced. Only a System Administrator can change it — every change is recorded in the audit log."
            value={teacher.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(e) => updateHouse.mutate({ id: teacher.id, houseId: e.target.value })}
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
            onChange={(e) => updateStatus.mutate({ id: teacher.id, status: e.target.value as TeacherEmploymentStatus })}
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} text={s.label} />
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}
