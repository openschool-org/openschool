import type { Dispatch, SetStateAction } from "react";
import { TextInput, NumberInput } from "@carbon/react";
import { Enterprise } from "@carbon/icons-react";
import LogoUpload from "../../../../components/school/LogoUpload";
import StepShell from "./StepShell";
import { EMAIL_RE, GRADE_MIN, GRADE_MAX, type SchoolFormState } from "../constants";

interface Props {
  school: SchoolFormState;
  setSchool: Dispatch<SetStateAction<SchoolFormState>>;
  schoolTouched: boolean;
  gradeRangeInvalid: boolean;
}

export default function SchoolStep({ school, setSchool, schoolTouched, gradeRangeInvalid }: Props) {
  return (
    <StepShell icon={Enterprise} title="School details" subtitle="The basics - you can fill in the rest later from Settings.">
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="ss-name"
          labelText="School Name"
          placeholder="e.g. Royal College"
          value={school.name}
          onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value }))}
          invalid={schoolTouched && !school.name.trim()}
          invalidText="School name is required."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <TextInput
            id="ss-phone"
            labelText="Phone"
            value={school.phone}
            onChange={(e) => setSchool((s) => ({ ...s, phone: e.target.value }))}
            invalid={schoolTouched && !school.phone.trim()}
            invalidText="Phone number is required."
          />
          <TextInput
            id="ss-email"
            labelText="Email"
            type="email"
            value={school.email}
            onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
            invalid={schoolTouched && !EMAIL_RE.test(school.email.trim())}
            invalidText="Enter a valid email address."
          />
        </div>
        <TextInput
          id="ss-address"
          labelText="Address"
          value={school.address}
          onChange={(e) => setSchool((s) => ({ ...s, address: e.target.value }))}
          invalid={schoolTouched && !school.address.trim()}
          invalidText="Address is required."
        />
        <LogoUpload
          value={school.logo_url}
          editing
          onChange={(v) => setSchool((s) => ({ ...s, logo_url: v }))}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <NumberInput
            id="ss-grade-from"
            label="Lowest grade"
            min={GRADE_MIN}
            max={GRADE_MAX}
            value={school.grade_from}
            onChange={(_e, { value }) =>
              setSchool((s) => ({ ...s, grade_from: value === "" ? "" : Number(value) }))
            }
          />
          <NumberInput
            id="ss-grade-to"
            label="Highest grade"
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={gradeRangeInvalid}
            invalidText="Must be ≥ lowest grade."
            value={school.grade_to}
            onChange={(_e, { value }) =>
              setSchool((s) => ({ ...s, grade_to: value === "" ? "" : Number(value) }))
            }
          />
        </div>
      </div>
    </StepShell>
  );
}
