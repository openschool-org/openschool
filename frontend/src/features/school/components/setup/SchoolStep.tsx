import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { ShopOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import LogoUpload from "@/features/school/components/LogoUpload";
import StepShell from "@/features/school/components/setup/StepShell";
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

  return (
    <StepShell icon={ShopOutlined} title="School details" subtitle="The basics - you can fill in the rest later from Settings.">
      <div className="os-school-details-form">
        <TextField
          id="ss-name"
          label="School name"
          placeholder="e.g. Royal College"
          value={school.name}
          onChange={(value) => setSchool((s) => ({ ...s, name: value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, name: true }))}
          invalid={showError("name") && !school.name.trim()}
          invalidText="School name is required."
          autoComplete="organization"
        />
        <div className="os-school-details-form__two-column">
          <TextField
            id="ss-phone"
          label="Phone"
          placeholder="0778449056 or 0112123123"
          helperText="Use a 10-digit Sri Lankan mobile or landline number."
          type="tel"
          inputMode="tel"
          value={school.phone}
          onChange={(value) => setSchool((s) => ({ ...s, phone: value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, phone: true }))}
          invalid={showError("phone") && (!school.phone.trim() || !isValidSriLankanPhone(school.phone))}
          invalidText={school.phone.trim() ? PHONE_INVALID_TEXT : "Phone number is required."}
          autoComplete="tel"
        />
          <TextField
            id="ss-email"
          label="Email"
          type="email"
          placeholder="office@yourschool.lk"
          helperText="Enter a valid school email address."
          value={school.email}
          onChange={(value) => setSchool((s) => ({ ...s, email: value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, email: true }))}
          invalid={showError("email") && !EMAIL_RE.test(school.email.trim())}
          invalidText="Enter a valid email address."
          autoComplete="email"
          />
        </div>
        <TextField
          id="ss-address"
          label="Address"
          value={school.address}
          onChange={(value) => setSchool((s) => ({ ...s, address: value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, address: true }))}
          invalid={showError("address") && !school.address.trim()}
          invalidText="Address is required."
          autoComplete="street-address"
        />
        <LogoUpload
          value={school.logo_url}
          editing
          onChange={(v) => setSchool((s) => ({ ...s, logo_url: v }))}
        />
        <SelectField
          id="ss-school-type"
          label="School type"
          helperText="Single-sex schools check student gender on enrolment."
          value={school.school_type}
          onChange={(value) => setSchool((s) => ({ ...s, school_type: value as "boys" | "girls" | "mixed" }))}
          options={[
            { value: "mixed", label: "Mixed" },
            { value: "boys", label: "Boys" },
            { value: "girls", label: "Girls" },
          ]}
        />
        <div className="os-school-details-form__two-column">
          <NumberField
            id="ss-grade-from"
            label="Lowest grade"
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={showError("grade_from") && (gradeFromInvalid || gradeRangeInvalid)}
            invalidText={gradeFromInvalid ? `Enter a grade from ${GRADE_MIN} to ${GRADE_MAX}.` : "Must not be higher than the highest grade."}
            value={school.grade_from === "" ? null : school.grade_from}
            onChange={(value) => setSchool((s) => ({ ...s, grade_from: value ?? "" }))}
            onBlur={() => setTouched((fields) => ({ ...fields, grade_from: true }))}
          />
          <NumberField
            id="ss-grade-to"
            label="Highest grade"
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={showError("grade_to") && (gradeToInvalid || gradeRangeInvalid)}
            invalidText={gradeToInvalid ? `Enter a grade from ${GRADE_MIN} to ${GRADE_MAX}.` : "Must not be lower than the lowest grade."}
            value={school.grade_to === "" ? null : school.grade_to}
            onChange={(value) => setSchool((s) => ({ ...s, grade_to: value ?? "" }))}
            onBlur={() => setTouched((fields) => ({ ...fields, grade_to: true }))}
          />
        </div>
      </div>
    </StepShell>
  );
}
