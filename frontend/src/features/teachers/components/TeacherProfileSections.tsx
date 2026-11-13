import { Col, Descriptions, Radio, Row } from "antd";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Teacher, TeacherTitle, TeacherEmploymentStatus, TeacherSubject } from "@/features/teachers/api/teacher";
import type { House } from "@/features/school/api/house";
import { TITLES, EMPLOYMENT_STATUSES } from "@/features/teachers/constants";
import TeacherSubjectsSection from "@/features/teachers/components/TeacherSubjectsSection";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { formatDateOnly, formatISODate } from "@/shared/lib/date";
import { capitalize } from "@/shared/lib/text";
import InfoTip from "@/shared/ui/InfoTip";
import SectionCard from "@/shared/ui/SectionCard";
import Field from "@/shared/ui/Field";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

export type TeacherProfileForm = {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  phone_number: string;
  nic_number: string;
  title: TeacherTitle | "";
  gender: "" | "male" | "female";
};

interface Props {
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
  assignSubject: UseMutationResult<unknown, unknown, string>;
  removeSubject: UseMutationResult<unknown, unknown, string>;
}

export default function TeacherProfileSections(p: Props) {
  const { teacher, form, editing, onChange } = p;
  const currentHouse = p.houses?.find((h) => h.id === teacher.house_id);
  const field = (id: string, label: string, key: keyof TeacherProfileForm) => ({
    id,
    label,
    value: form[key],
    readOnly: !editing,
    onChange: (value: string) => onChange(key, value),
  });

  // View mode reads as a list of facts; the inputs only appear once Edit is pressed.
  // Three per row on wide screens, ordered so no row is left half empty.
  const facts = [
    { key: "full_name", label: "Full name", children: teacher.full_name },
    { key: "initials", label: "Name with initials", children: teacher.name_with_initials || "-" },
    { key: "calling", label: "Calling name", children: teacher.calling_name || "-" },
    { key: "title", label: "Title", children: teacher.title || "-" },
    { key: "gender", label: "Gender", children: teacher.gender ? capitalize(teacher.gender) : "-" },
    { key: "employee", label: "Employee number", children: teacher.employee_number },
    { key: "email", label: "Email", children: teacher.email ?? "-" },
    { key: "phone", label: "Phone", children: teacher.phone || "-" },
    { key: "nic", label: "NIC number", children: teacher.nic_number || "-" },
    { key: "joined", label: "Joined date", children: formatDateOnly(teacher.joined_date) },
    { key: "created", label: "Created", children: formatISODate(teacher.created_at) },
  ];

  return (
    <Row gutter={[24, 0]}>
      <Col xs={24} xl={16}>
      <SectionCard title="Profile">
          <MutationErrorNotification isError={!!p.updateError} error={null} fallback={p.updateError ?? ""} />
          {editing ? (
            <div className="os-modal-form">
              <SelectField
                id="title"
                label="Title"
                value={form.title}
                disabled={!editing}
                onChange={(v) => p.onTitleChange(v as TeacherTitle | "")}
                options={[{ value: "", label: "None" }, ...TITLES.map((t) => ({ value: t, label: t }))]}
              />
              <Field id="edit-gender" label="Gender">
                <Radio.Group id="edit-gender" value={form.gender || undefined} disabled={!editing} onChange={(e) => p.onGenderChange(e.target.value)}>
                  <Radio value="male">Male</Radio>
                  <Radio value="female">Female</Radio>
                </Radio.Group>
              </Field>
              <PersonNameFields
                idPrefix="teacher-profile"
                value={form}
                readOnly={!editing}
                fullNameInvalid={editing && !form.full_name.trim()}
                onChange={(next) => {
                  (["full_name", "name_with_initials", "calling_name"] as const).forEach((key) => {
                    if (next[key] !== form[key]) onChange(key, next[key]);
                  });
                }}
              />
              <TextField {...field("phone", "Phone", "phone_number")} />
              <TextField {...field("nic-number", "NIC number", "nic_number")} />
            </div>
          ) : (
            <Descriptions className="os-facts" layout="vertical" colon={false} column={{ xs: 1, sm: 2, lg: 3 }} items={facts} />
          )}
      </SectionCard>

      <TeacherSubjectsSection subjects={p.subjects} editing={editing} assignSubject={p.assignSubject} removeSubject={p.removeSubject} />
      </Col>

      <Col xs={24} xl={8}>

      <SectionCard title="House">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-dot os-w-3q os-h-3q" style={{ backgroundColor: currentHouse.color }} />
              <span className="os-text-md os-fw-600">{currentHouse.name}</span>
            </div>
          )}
          <SelectField
            id="teacher-house"
            label={<>Assigned house <InfoTip>Only a system administrator can change it. Every change is recorded in the audit log.</InfoTip></>}
            helperText="Assigned automatically to balance houses."
            value={teacher.house_id ?? ""}
            disabled={p.updateHouse.isPending}
            onChange={(v) => p.updateHouse.mutate({ id: teacher.id, houseId: v })}
            options={[{ value: "", label: "No house" }, ...(p.houses ?? []).map((h) => ({ value: h.id, label: h.name }))]}
          />
      </SectionCard>

      <SectionCard title="Employment status">
          <SelectField
            id="teacher-employment-status"
            label="Status"
            helperText="Mark resigned or transferred when a teacher leaves the school."
            value={teacher.employment_status}
            disabled={p.updateStatus.isPending}
            onChange={(v) => p.updateStatus.mutate({ id: teacher.id, status: v as TeacherEmploymentStatus })}
            options={EMPLOYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
      </SectionCard>
      </Col>
    </Row>
  );
}
