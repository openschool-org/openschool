import { TextInput, Select, SelectItem, RadioButtonGroup, RadioButton } from "@carbon/react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Teacher, TeacherTitle, TeacherEmploymentStatus, TeacherSubject } from "@/features/teachers/api/teacher";
import type { House } from "@/features/school/api/house";
import { TITLES, EMPLOYMENT_STATUSES } from "@/features/teachers/constants";
import TeacherSubjectsSection from "@/features/teachers/components/TeacherSubjectsSection";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";
import InfoTip from "@/shared/ui/InfoTip";

export type TeacherProfileForm = {
  given_name: string;
  family_name: string;
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
  const field = (id: string, labelText: string, key: keyof TeacherProfileForm) => ({
    id,
    labelText,
    value: form[key],
    readOnly: !editing,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value),
  });

  return (
    <>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Profile</h2>
        </div>
        <div className="os-section__body">
          <MutationErrorNotification isError={!!p.updateError} error={null} fallback={p.updateError ?? ""} />
          <div className="os-grid os-grid-cols-2 os-gap-5">
            <Select id="title" labelText="Title" value={form.title} disabled={!editing} onChange={(e) => p.onTitleChange(e.target.value as TeacherTitle | "")}>
              <SelectItem value="" text="None" />
              {TITLES.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <RadioButtonGroup legendText="Gender" name="gender" valueSelected={form.gender} disabled={!editing} onChange={(value) => p.onGenderChange(value as "male" | "female")}>
              <RadioButton id="edit-gender-male" labelText="Male" value="male" />
              <RadioButton id="edit-gender-female" labelText="Female" value="female" />
            </RadioButtonGroup>
            <TextInput {...field("given-name", "First name", "given_name")} />
            <TextInput {...field("family-name", "Last name", "family_name")} />
            <TextInput id="employee-number" labelText="Employee number" value={teacher.employee_number} readOnly />
            <TextInput id="email" labelText="Email" value={teacher.email ?? "-"} readOnly />
            <TextInput {...field("phone", "Phone", "phone_number")} />
            <TextInput {...field("nic-number", "NIC number", "nic_number")} />
            <TextInput id="joined-date" labelText="Joined date" value={teacher.joined_date ?? "-"} readOnly />
            <TextInput id="created-at" labelText="Created" value={formatDate(teacher.created_at)} readOnly />
          </div>
        </div>
      </div>

      <TeacherSubjectsSection subjects={p.subjects} editing={editing} assignSubject={p.assignSubject} removeSubject={p.removeSubject} />

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">House</h2>
        </div>
        <div className="os-section__body">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-dot os-w-3q os-h-3q" style={{ backgroundColor: currentHouse.color }} />
              <span className="os-text-md os-fw-600">{currentHouse.name}</span>
            </div>
          )}
          <Select
            id="teacher-house"
            labelText={<>Assigned house <InfoTip>Only a system administrator can change it. Every change is recorded in the audit log.</InfoTip></>}
            helperText="Assigned automatically to balance houses."
            value={teacher.house_id ?? ""}
            disabled={p.updateHouse.isPending}
            onChange={(e) => p.updateHouse.mutate({ id: teacher.id, houseId: e.target.value })}
          >
            <SelectItem value="" text="No house" />
            {p.houses?.map((h) => <SelectItem key={h.id} value={h.id} text={h.name} />)}
          </Select>
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Employment status</h2>
        </div>
        <div className="os-section__body">
          <Select
            id="teacher-employment-status"
            labelText="Status"
            helperText="Mark resigned or transferred when a teacher leaves the school."
            value={teacher.employment_status}
            disabled={p.updateStatus.isPending}
            onChange={(e) => p.updateStatus.mutate({ id: teacher.id, status: e.target.value as TeacherEmploymentStatus })}
          >
            {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} text={s.label} />)}
          </Select>
        </div>
      </div>
    </>
  );
}
