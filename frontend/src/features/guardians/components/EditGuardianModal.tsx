import { useState } from "react";
import TextField from "@/shared/ui/TextField";
import SelectField from "@/shared/ui/SelectField";
import { useUpdateGuardian } from "@/features/guardians/queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { Guardian, GuardianRelationship } from "@/features/guardians/api/guardian";
import FormModal from "@/shared/ui/FormModal";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";

export default function EditGuardianModal({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  const updateGuardian = useUpdateGuardian();
  const [form, setForm] = useState({
    full_name: guardian.full_name,
    name_with_initials: guardian.name_with_initials ?? "",
    calling_name: guardian.calling_name ?? "",
    relationship: guardian.relationship,
    phone: guardian.phone,
    email: guardian.email ?? "",
    nic_number: guardian.nic_number,
  });
  const [touched, setTouched] = useState<{
    full_name?: boolean;
    phone?: boolean;
    nic_number?: boolean;
  }>({});

  const isValid =
    form.full_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    isValidSriLankanPhone(form.phone) &&
    form.nic_number.trim().length > 0;

  const handleSave = () => {
    setTouched({ full_name: true, phone: true, nic_number: true });
    if (!isValid) return;
    updateGuardian.mutate(
      {
        id: guardian.id,
        data: {
          full_name: form.full_name.trim(),
          name_with_initials: form.name_with_initials.trim(),
          calling_name: form.calling_name.trim(),
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          nic_number: form.nic_number.trim(),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <FormModal
      open
      title="Edit guardian"
      onClose={onClose}
      onSubmit={handleSave}
      isPending={updateGuardian.isPending}
      isError={updateGuardian.isError}
      error={updateGuardian.error}
      errorFallback="Failed to update guardian"
    >
      <div className="os-grid os-gap-4">
        <PersonNameFields
          idPrefix="edit-guardian"
          value={form}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          fullNameInvalid={!!touched.full_name && !form.full_name.trim()}
          onFullNameBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
        />
        <SelectField
          id="edit-guardian-relationship"
          label="Relationship"
          value={form.relationship}
          onChange={(v) => setForm((f) => ({ ...f, relationship: v as GuardianRelationship }))}
          options={GUARDIAN_RELATIONSHIPS.map((r) => ({ value: r.value, label: r.label }))}
        />
        <TextField
          id="edit-guardian-phone"
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
          invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "A phone number is required."}
        />
        <TextField
          id="edit-guardian-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
        />
        <TextField
          id="edit-guardian-nic"
          label="NIC number"
          value={form.nic_number}
          onChange={(v) => setForm((f) => ({ ...f, nic_number: v }))}
          onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
          invalid={!!touched.nic_number && !form.nic_number.trim()}
          invalidText="NIC number is required."
        />
      </div>
    </FormModal>
  );
}
