import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import TextField from "@/shared/ui/TextField";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import LogoUpload from "@/features/school/components/LogoUpload";
import { GRADE_MIN, GRADE_MAX, type SchoolFormState } from "@/features/school/setupConstants";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";

interface Props {
  school: SchoolFormState;
  setSchool: Dispatch<SetStateAction<SchoolFormState>>;
  schoolTouched: boolean;
  gradeRangeInvalid: boolean;
}

export default function SchoolStep({ school, setSchool, schoolTouched, gradeRangeInvalid }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const showError = (field: string) => schoolTouched || !!touched[field];
  const gradeFromInvalid = school.grade_from === "" || Number(school.grade_from) < GRADE_MIN || Number(school.grade_from) > GRADE_MAX;
  const gradeToInvalid = school.grade_to === "" || Number(school.grade_to) < GRADE_MIN || Number(school.grade_to) > GRADE_MAX;

  const set = (patch: Partial<SchoolFormState>) => setSchool((s) => ({ ...s, ...patch }));
  const blur = (field: string) => () => setTouched((fields) => ({ ...fields, [field]: true }));

  // Rows line up across both columns: name with type, contact numbers with the grade range, address with the logo.
  return (
    <div className="os-setup-rows">
      <TextField
        id="ss-name"
        label="School name"
        placeholder="e.g. Royal College"
        value={school.name}
        onChange={(value) => set({ name: value })}
        onBlur={blur("name")}
        invalid={showError("name") && !school.name.trim()}
        invalidText="School name is required."
        autoComplete="organization"
      />
      <SelectField
        id="ss-school-type"
        label="School type"
        helperText="Single-sex schools check student gender on enrolment."
        value={school.school_type}
        onChange={(value) => set({ school_type: value as SchoolFormState["school_type"] })}
        options={[
          { value: "mixed", label: "Mixed" },
          { value: "boys", label: "Boys" },
          { value: "girls", label: "Girls" },
        ]}
      />

      <div className="os-setup-pair">
        <TextField
          id="ss-phone"
          label="Phone"
          placeholder="0372224776"
          type="tel"
          inputMode="tel"
          value={school.phone}
          onChange={(value) => set({ phone: value })}
          onBlur={blur("phone")}
          invalid={showError("phone") && (!school.phone.trim() || !isValidSriLankanPhone(school.phone))}
          invalidText={school.phone.trim() ? PHONE_INVALID_TEXT : "Phone number is required."}
          autoComplete="tel"
        />
        <TextField
          id="ss-email"
          label="Email"
          type="email"
          placeholder="office@yourschool.lk"
          value={school.email}
          onChange={(value) => set({ email: value })}
          onBlur={blur("email")}
          invalid={showError("email") && !EMAIL_RE.test(school.email.trim())}
          invalidText="Enter a valid email address."
          autoComplete="email"
        />
      </div>
      <div className="os-setup-pair">
        <NumberField
          id="ss-grade-from"
          label="Lowest grade"
          min={GRADE_MIN}
          max={GRADE_MAX}
          invalid={showError("grade_from") && (gradeFromInvalid || gradeRangeInvalid)}
          invalidText={gradeFromInvalid ? `Enter a grade from ${GRADE_MIN} to ${GRADE_MAX}.` : "Must not be higher than the highest grade."}
          value={school.grade_from === "" ? null : school.grade_from}
          onChange={(value) => set({ grade_from: value ?? "" })}
          onBlur={blur("grade_from")}
        />
        <NumberField
          id="ss-grade-to"
          label="Highest grade"
          min={GRADE_MIN}
          max={GRADE_MAX}
          invalid={showError("grade_to") && (gradeToInvalid || gradeRangeInvalid)}
          invalidText={gradeToInvalid ? `Enter a grade from ${GRADE_MIN} to ${GRADE_MAX}.` : "Must not be lower than the lowest grade."}
          value={school.grade_to === "" ? null : school.grade_to}
          onChange={(value) => set({ grade_to: value ?? "" })}
          onBlur={blur("grade_to")}
        />
      </div>

      <TextField
        id="ss-address"
        label="Address"
        placeholder="e.g. Puttalam Road, Kurunegala"
        value={school.address}
        onChange={(value) => set({ address: value })}
        onBlur={blur("address")}
        invalid={showError("address") && !school.address.trim()}
        invalidText="Address is required."
        autoComplete="street-address"
      />
      <div className="os-field">
        <span className="os-field__label">Logo</span>
        <LogoUpload value={school.logo_url} editing onChange={(v) => set({ logo_url: v })} />
      </div>
    </div>
  );
}
