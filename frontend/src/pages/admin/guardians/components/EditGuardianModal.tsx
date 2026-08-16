import { useState } from "react";
import { TextInput, Select, SelectItem } from "@carbon/react";
import { useUpdateGuardian } from "../../../../queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "../../../../services/guardian";
import type { Guardian, GuardianRelationship } from "../../../../services/guardian";
import FormModal from "../../../../components/common/FormModal";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "../../../../lib/phone";

export default function EditGuardianModal({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  const updateGuardian = useUpdateGuardian();
  const [form, setForm] = useState({
    full_name: guardian.full_name,
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
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="edit-guardian-name"
          labelText="Full Name"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
          invalid={!!touched.full_name && !form.full_name.trim()}
          invalidText="A name is required."
        />
        <Select
          id="edit-guardian-relationship"
          labelText="Relationship"
          value={form.relationship}
          onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as GuardianRelationship }))}
        >
          {GUARDIAN_RELATIONSHIPS.map((r) => (
            <SelectItem key={r.value} value={r.value} text={r.label} />
          ))}
        </Select>
        <TextInput
          id="edit-guardian-phone"
          labelText="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
          invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "A phone number is required."}
        />
        <TextInput
          id="edit-guardian-email"
          labelText="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <TextInput
          id="edit-guardian-nic"
          labelText="NIC Number"
          value={form.nic_number}
          onChange={(e) => setForm((f) => ({ ...f, nic_number: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
          invalid={!!touched.nic_number && !form.nic_number.trim()}
          invalidText="NIC number is required."
        />
      </div>
    </FormModal>
  );
}
