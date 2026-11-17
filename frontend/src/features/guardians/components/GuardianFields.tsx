import TextField from "@/shared/ui/TextField";
import SelectField from "@/shared/ui/SelectField";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { GuardianRelationship } from "@/features/guardians/api/guardian";
import type { GuardianFormValues, GuardianTouched } from "@/features/guardians/hooks/useGuardianForm";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";

interface Props {
  idPrefix: string;
  form: GuardianFormValues;
  touched: GuardianTouched;
  onChange: (next: Partial<GuardianFormValues>) => void;
  onTouch: (field: keyof GuardianTouched) => void;
  emailLabel?: string;
  nicHelperText?: string;
}

// Names, relationship, phone, email and NIC for a guardian, with the shared validation messages.
export default function GuardianFields({ idPrefix, form, touched, onChange, onTouch, emailLabel = "Email", nicHelperText }: Props) {
  return (
    <div className="os-grid os-gap-4">
      <PersonNameFields
        idPrefix={idPrefix}
        value={form}
        onChange={onChange}
        fullNameInvalid={!!touched.full_name && !form.full_name.trim()}
        onFullNameBlur={() => onTouch("full_name")}
      />
      <SelectField
        id={`${idPrefix}-relationship`}
        label="Relationship"
        value={form.relationship}
        onChange={(v) => onChange({ relationship: v as GuardianRelationship })}
        options={GUARDIAN_RELATIONSHIPS}
      />
      <TextField
        id={`${idPrefix}-phone`}
        label="Phone"
        value={form.phone}
        onChange={(v) => onChange({ phone: v })}
        onBlur={() => onTouch("phone")}
        invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
        invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "A phone number is required."}
      />
      <TextField
        id={`${idPrefix}-email`}
        label={emailLabel}
        type="email"
        value={form.email}
        onChange={(v) => onChange({ email: v })}
      />
      <TextField
        id={`${idPrefix}-nic`}
        label="NIC number"
        value={form.nic_number}
        onChange={(v) => onChange({ nic_number: v })}
        onBlur={() => onTouch("nic_number")}
        invalid={!!touched.nic_number && !form.nic_number.trim()}
        invalidText="NIC number is required."
        helperText={nicHelperText}
      />
    </div>
  );
}
