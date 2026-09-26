import { TextInput, Select, SelectItem } from "@carbon/react";
import { Building } from "@carbon/icons-react";
import LogoUpload from "@/features/school/components/LogoUpload";
import type { SchoolType } from "@/features/school/api/school";

export interface SchoolFormValues {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  school_type: SchoolType;
}

interface SchoolInfoCardProps {
  values: SchoolFormValues;
  editing: boolean;
  onChange: (field: keyof SchoolFormValues, value: string) => void;
}

export default function SchoolInfoCard({ values, editing, onChange }: SchoolInfoCardProps) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title os-flex os-items-center os-gap-2">
          <Building size={16} className="os-fill-accent-dark" /> School information
        </h2>
      </div>
      <div className="os-section__body">
        <div className="os-grid os-grid-cols-2 os-gap-5">
          <TextInput
            id="school-name"
            labelText="School name"
            value={values.name}
            readOnly={!editing}
            onChange={e => onChange("name", e.target.value)}
          />
          <TextInput
            id="school-email"
            labelText="Email"
            value={values.email}
            readOnly={!editing}
            onChange={e => onChange("email", e.target.value)}
          />
          <div className="os-col-span-full">
            <TextInput
              id="school-address"
              labelText="Address"
              value={values.address}
              readOnly={!editing}
              onChange={e => onChange("address", e.target.value)}
            />
          </div>
          <TextInput
            id="school-phone"
            labelText="Phone"
            value={values.phone}
            readOnly={!editing}
            onChange={e => onChange("phone", e.target.value)}
          />
          <Select
            id="school-type"
            labelText="School type"
            helperText="Single-sex schools enforce matching student gender on enrolment."
            value={values.school_type}
            disabled={!editing}
            onChange={e => onChange("school_type", e.target.value)}
          >
            <SelectItem value="mixed" text="Mixed" />
            <SelectItem value="boys" text="Boys" />
            <SelectItem value="girls" text="Girls" />
          </Select>
          <div className="os-col-span-full">
            <LogoUpload
              value={values.logo_url}
              editing={editing}
              onChange={(v) => onChange("logo_url", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
