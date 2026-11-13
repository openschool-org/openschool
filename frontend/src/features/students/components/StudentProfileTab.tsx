import { Col, Descriptions, Input, Radio, Row, Tag } from "antd";
import type { StudentWithClass, StudentEnrollmentStatus } from "@/features/students/api/student";
import type { House } from "@/features/school/api/house";
import type { UseMutationResult } from "@tanstack/react-query";
import InfoTip from "@/shared/ui/InfoTip";
import SectionCard from "@/shared/ui/SectionCard";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import Field from "@/shared/ui/Field";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

type Gender = "" | "male" | "female";

const ENROLLMENT_STATUSES: { value: StudentEnrollmentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left the school" },
];

export type StudentProfileForm = {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
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

  // View mode reads as facts, three per row on wide screens; inputs only appear in edit mode.
  const facts = [
    { key: "full_name", label: "Full name", children: student.full_name },
    { key: "initials", label: "Name with initials", children: student.name_with_initials || "-" },
    { key: "calling", label: "Calling name", children: student.calling_name || "-" },
    { key: "index", label: "Index number", children: student.index_number },
    { key: "gender", label: "Gender", children: form.gender ? form.gender[0].toUpperCase() + form.gender.slice(1) : "-" },
    { key: "email", label: "Email", children: student.email ?? "-" },
    { key: "phone", label: "Phone", children: form.phone_number || "-" },
    { key: "whatsapp", label: "WhatsApp", children: form.whatsapp || "-" },
    { key: "address", label: "Address", children: form.address || "-" },
    { key: "remarks", label: "Special remarks", children: form.special_remarks || "-", span: "filled" as const },
  ];

  return (
    <Row gutter={[24, 0]} className="os-mt-4">
      <Col xs={24} xl={16}>
      <SectionCard title="Profile">
          <MutationErrorNotification isError={!!updateError} error={null} title="Could not update student" fallback={updateError ?? "Please try again."} />
          {editing ? (
            <div className="os-modal-form">
              <PersonNameFields
                idPrefix="student-profile"
                value={form}
                fullNameInvalid={!form.full_name.trim()}
                onChange={(next) => {
                  (["full_name", "name_with_initials", "calling_name"] as const).forEach((field) => {
                    if (next[field] !== form[field]) onChange(field, next[field]);
                  });
                }}
              />
              <TextField id="phone" label="Phone" value={form.phone_number} onChange={(v) => onChange("phone_number", v)} />
              <TextField id="whatsapp" label="WhatsApp" value={form.whatsapp} onChange={(v) => onChange("whatsapp", v)} />
              <TextField id="address" label="Address" value={form.address} onChange={(v) => onChange("address", v)} />
              <fieldset className="os-field">
                <legend className="os-field__label">Gender</legend>
                <Radio.Group name="gender" value={form.gender} onChange={(e) => onGenderChange(e.target.value as Gender)}>
                  <Radio value="male">Male</Radio>
                  <Radio value="female">Female</Radio>
                </Radio.Group>
              </fieldset>
              <div className="os-col-span-full">
                <Field id="special-remarks" label="Special remarks">
                  <Input.TextArea id="special-remarks" rows={3} value={form.special_remarks} onChange={(e) => onChange("special_remarks", e.target.value)} />
                </Field>
              </div>
            </div>
          ) : (
            <Descriptions className="os-facts" layout="vertical" colon={false} column={{ xs: 1, sm: 2, lg: 3 }} items={facts} />
          )}
      </SectionCard>
      </Col>

      <Col xs={24} xl={8}>
      <SectionCard title="Current class">
          {student.class_name ? (
            <div className="os-flex os-gap-2 os-wrap">
              <Tag color="blue" variant="filled">{student.class_name}</Tag>
              {student.grade_name && <Tag variant="filled">{student.grade_name}</Tag>}
              {student.academic_year && <Tag variant="filled">{student.academic_year}</Tag>}
            </div>
          ) : (
            <span className="os-text-md os-c-tertiary">Not enrolled in a class.</span>
          )}
      </SectionCard>

      <SectionCard title="House">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-inline-block os-w-3q os-h-3q os-rounded-full" style={{ backgroundColor: currentHouse.color }}
              />
              <span className="os-text-md os-fw-500">{currentHouse.name}</span>
            </div>
          )}
          <SelectField
            id="student-house"
            label={<>Assigned house <InfoTip>Only a system administrator can change it. Every change is recorded in the audit log.</InfoTip></>}
            helperText="Assigned automatically to balance houses."
            value={student.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(v) => updateHouse.mutate({ id: student.id, houseId: v })}
            options={[{ value: "", label: "No house" }, ...(houses ?? []).map((h) => ({ value: h.id, label: h.name }))]}
          />
      </SectionCard>

      <SectionCard title="Enrolment status">
          <SelectField
            id="student-enrollment-status"
            label="Status"
            helperText="Mark as left when a student leaves the school."
            value={student.enrollment_status}
            disabled={updateStatus.isPending}
            onChange={(v) => updateStatus.mutate({ id: student.id, status: v as StudentEnrollmentStatus })}
            options={ENROLLMENT_STATUSES}
          />
      </SectionCard>
      </Col>
    </Row>
  );
}
