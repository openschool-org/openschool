import { TextInput, TextArea, Select, SelectItem, RadioButtonGroup, RadioButton, InlineNotification, Tag } from "@carbon/react";
import type { StudentWithClass, StudentEnrollmentStatus } from "@/features/students/api/student";
import type { House } from "@/features/school/api/house";
import type { UseMutationResult } from "@tanstack/react-query";
import InfoTip from "@/shared/ui/InfoTip";

type Gender = "" | "male" | "female";

const ENROLLMENT_STATUSES: { value: StudentEnrollmentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left the school" },
];

export type StudentProfileForm = {
  given_name: string;
  family_name: string;
  phone_number: string;
  address: string;
  whatsapp: string;
  special_remarks: string;
  gender: Gender;
};

export default function StudentProfileTab({
  student,
  form,
  editing,
  onChange,
  onGenderChange,
  updateError,
  houses,
  updateHouse,
  updateStatus,
}: {
  student: StudentWithClass;
  form: StudentProfileForm;
  editing: boolean;
  onChange: (field: keyof StudentProfileForm, value: string) => void;
  onGenderChange: (value: Gender) => void;
  updateError: string | null;
  houses: House[] | undefined;
  updateHouse: UseMutationResult<unknown, unknown, { id: string; houseId: string }>;
  updateStatus: UseMutationResult<unknown, unknown, { id: string; status: StudentEnrollmentStatus }>;
}) {
  const currentHouse = houses?.find((h) => h.id === student.house_id);

  return (
    <>
      <div className="os-section os-mt-4">
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
              hideCloseButton className="os-mb-4 os-max-w-full"
            />
          )}
          <div className="os-grid os-grid-cols-2 os-gap-5">
            <TextInput
              id="given-name"
              labelText="First name"
              value={form.given_name}
              readOnly={!editing}
              onChange={(e) => onChange("given_name", e.target.value)}
            />
            <TextInput
              id="family-name"
              labelText="Last name"
              value={form.family_name}
              readOnly={!editing}
              onChange={(e) => onChange("family_name", e.target.value)}
            />
            <TextInput id="index-number" labelText="Index number" value={student.index_number} readOnly />
            <TextInput id="email" labelText="Email" value={student.email ?? "-"} readOnly />
            <TextInput
              id="phone"
              labelText="Phone"
              value={form.phone_number}
              readOnly={!editing}
              onChange={(e) => onChange("phone_number", e.target.value)}
            />
            <TextInput
              id="whatsapp"
              labelText="WhatsApp"
              value={form.whatsapp}
              readOnly={!editing}
              onChange={(e) => onChange("whatsapp", e.target.value)}
            />
            <TextInput
              id="address"
              labelText="Address"
              value={form.address}
              readOnly={!editing}
              onChange={(e) => onChange("address", e.target.value)}
            />
            {editing ? (
              <RadioButtonGroup
                legendText="Gender"
                name="gender"
                valueSelected={form.gender}
                onChange={(value) => onGenderChange(value as Gender)}
              >
                <RadioButton id="gender-male" labelText="Male" value="male" />
                <RadioButton id="gender-female" labelText="Female" value="female" />
              </RadioButtonGroup>
            ) : (
              <TextInput
                id="gender"
                labelText="Gender"
                value={form.gender ? form.gender[0].toUpperCase() + form.gender.slice(1) : "-"}
                readOnly
              />
            )}
            <div className="os-col-span-full">
              <TextArea
                id="special-remarks"
                labelText="Special remarks"
                rows={3}
                value={form.special_remarks}
                readOnly={!editing}
                onChange={(e) => onChange("special_remarks", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Current class</h2>
        </div>
        <div className="os-section__body">
          {student.class_name ? (
            <div className="os-flex os-gap-2 os-wrap">
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
            <span className="os-text-md os-c-tertiary">Not enrolled in a class.</span>
          )}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">House</h2>
        </div>
        <div className="os-section__body">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-inline-block os-w-3q os-h-3q os-rounded-full" style={{ backgroundColor: currentHouse.color }}
              />
              <span className="os-text-md os-fw-600">{currentHouse.name}</span>
            </div>
          )}
          <Select
            id="student-house"
            labelText={<>Assigned house <InfoTip>Only a system administrator can change it. Every change is recorded in the audit log.</InfoTip></>}
            helperText="Assigned automatically to balance houses."
            value={student.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(e) => updateHouse.mutate({ id: student.id, houseId: e.target.value })}
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
          <h2 className="os-section__title">Enrolment status</h2>
        </div>
        <div className="os-section__body">
          <Select
            id="student-enrollment-status"
            labelText="Status"
            helperText="Mark as left when a student leaves the school."
            value={student.enrollment_status}
            disabled={updateStatus.isPending}
            onChange={(e) => updateStatus.mutate({ id: student.id, status: e.target.value as StudentEnrollmentStatus })}
          >
            {ENROLLMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} text={s.label} />
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}
