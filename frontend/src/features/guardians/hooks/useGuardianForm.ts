import { useState } from "react";
import type { GuardianRelationship } from "@/features/guardians/api/guardian";
import { isValidSriLankanPhone } from "@/shared/lib/phone";

export interface GuardianFormValues {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string;
  nic_number: string;
}

export type GuardianTouched = Partial<Record<"full_name" | "phone" | "nic_number", boolean>>;

export const EMPTY_GUARDIAN_FORM: GuardianFormValues = {
  full_name: "",
  name_with_initials: "",
  calling_name: "",
  relationship: "father",
  phone: "",
  email: "",
  nic_number: "",
};

export function isGuardianFormValid(form: GuardianFormValues): boolean {
  return (
    form.full_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    isValidSriLankanPhone(form.phone) &&
    form.nic_number.trim().length > 0
  );
}

// Form state, touched flags and validity shared by the add and edit guardian modals.
export function useGuardianForm(initial: GuardianFormValues = EMPTY_GUARDIAN_FORM) {
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState<GuardianTouched>({});
  return {
    form,
    touched,
    isValid: isGuardianFormValid(form),
    patch: (next: Partial<GuardianFormValues>) => setForm((f) => ({ ...f, ...next })),
    touch: (field: keyof GuardianTouched) => setTouched((t) => ({ ...t, [field]: true })),
    touchAll: () => setTouched({ full_name: true, phone: true, nic_number: true }),
  };
}
