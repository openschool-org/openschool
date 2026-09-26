import { useState } from "react";
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  RadioButtonGroup,
  RadioButton,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
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
    <ComposedModal open size="sm" onClose={onClose} aria-label={isEdit ? "Edit staff member" : "Add staff member"}>
      <ModalHeader title={isEdit ? "Edit staff member" : "Add staff member"} />
      <ModalBody>
        <MutationErrorNotification
          isError={!!error}
          error={error}
          title="Could not save staff member" fallback="Please try again." className="os-mb-4"
        />
        <div className="os-grid os-gap-4">
          <TextInput
            id="staff-name"
            labelText="Full name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
            invalid={!!touched.full_name && !form.full_name.trim()}
            invalidText="A name is required."
          />
          <Select
            id="staff-designation"
            labelText="Designation"
            value={form.designation}
            onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value as NonAcademicDesignation }))}
            invalid={!!touched.designation && !form.designation}
            invalidText="Select a designation."
          >
            <SelectItem value="" text="Select…" />
            {NON_ACADEMIC_DESIGNATIONS.map((d) => (
              <SelectItem key={d.value} value={d.value} text={d.label} />
            ))}
          </Select>
          <RadioButtonGroup
            legendText="Gender (optional)"
            name="staff-gender"
            valueSelected={form.gender}
            onChange={(value) => setForm((f) => ({ ...f, gender: value as "male" | "female" }))}
          >
            <RadioButton id="staff-gender-male" labelText="Male" value="male" />
            <RadioButton id="staff-gender-female" labelText="Female" value="female" />
          </RadioButtonGroup>
          <TextInput
            id="staff-phone"
            labelText="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          {!isEdit && (
            <DateField value={form.joined_date} onChange={(ymd) => {
                if (ymd) {
                  setForm((f) => ({ ...f, joined_date: ymd }));
                }
              }} id="staff-joined-date" labelText="Joining date" />
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!isValid || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
