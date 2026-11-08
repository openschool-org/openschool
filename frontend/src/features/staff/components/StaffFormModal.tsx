import { useState } from "react";
import { Button, Modal, Radio } from "antd";
import TextField from "@/shared/ui/TextField";
import SelectField from "@/shared/ui/SelectField";
import { useCreateNonAcademicStaff, useUpdateNonAcademicStaff } from "@/features/staff/queries/useNonAcademicStaff";
import { NON_ACADEMIC_DESIGNATIONS } from "@/features/staff/api/nonAcademicStaff";
import type { NonAcademicStaff as StaffRow, NonAcademicDesignation } from "@/features/staff/api/nonAcademicStaff";
import { todayISODate } from "@/shared/lib/date";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";

export default function StaffFormModal({ staff, onClose }: { staff: StaffRow | null; onClose: () => void }) {
  const isEdit = !!staff;
  const createStaff = useCreateNonAcademicStaff();
  const updateStaff = useUpdateNonAcademicStaff();
  const pending = createStaff.isPending || updateStaff.isPending;
  const error = createStaff.error ?? updateStaff.error;

  const [form, setForm] = useState({
    full_name: staff?.full_name ?? "",
    designation: (staff?.designation ?? "") as NonAcademicDesignation | "",
    phone: staff?.phone ?? "",
    gender: (staff?.gender ?? "") as "" | "male" | "female",
    joined_date: staff?.joined_date ?? todayISODate(),
  });
  const [touched, setTouched] = useState<{ full_name?: boolean; designation?: boolean }>({});

  const isValid = form.full_name.trim().length > 0 && !!form.designation;

  const handleSave = () => {
    setTouched({ full_name: true, designation: true });
    if (!isValid) return;

    if (isEdit && staff) {
      updateStaff.mutate(
        {
          id: staff.id,
          data: {
            full_name: form.full_name.trim(),
            designation: form.designation as NonAcademicDesignation,
            phone: form.phone.trim() || undefined,
            gender: form.gender || undefined,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createStaff.mutate(
        {
          full_name: form.full_name.trim(),
          designation: form.designation as NonAcademicDesignation,
          phone: form.phone.trim() || undefined,
          gender: form.gender || undefined,
          joined_date: new Date(form.joined_date).toISOString(),
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal
      open
      width={520}
      onCancel={onClose}
      title={isEdit ? "Edit staff member" : "Add staff member"}
      footer={
        <>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave} disabled={!isValid || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <MutationErrorNotification
        isError={!!error}
        error={error}
        title="Could not save staff member" fallback="Please try again." className="os-mb-4"
      />
      <div className="os-grid os-gap-4">
        <TextField
          id="staff-name"
          label="Full name"
          value={form.full_name}
          onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
          onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
          invalid={!!touched.full_name && !form.full_name.trim()}
          invalidText="A name is required."
        />
        <SelectField
          id="staff-designation"
          label="Designation"
          value={form.designation}
          onChange={(v) => setForm((f) => ({ ...f, designation: v as NonAcademicDesignation }))}
          invalid={!!touched.designation && !form.designation}
          invalidText="Select a designation."
          options={[{ value: "", label: "Select…" }, ...NON_ACADEMIC_DESIGNATIONS.map((d) => ({ value: d.value, label: d.label }))]}
        />
        <fieldset className="os-field">
          <legend className="os-field__label">Gender (optional)</legend>
          <Radio.Group name="staff-gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "male" | "female" }))}>
            <Radio value="male">Male</Radio>
            <Radio value="female">Female</Radio>
          </Radio.Group>
        </fieldset>
        <TextField
          id="staff-phone"
          label="Phone (optional)"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
        />
        {!isEdit && (
          <DateField value={form.joined_date} onChange={(ymd) => {
              if (ymd) {
                setForm((f) => ({ ...f, joined_date: ymd }));
              }
            }} id="staff-joined-date" labelText="Joining date" />
        )}
      </div>
    </Modal>
  );
}
