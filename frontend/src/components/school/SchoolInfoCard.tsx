import { TextInput, Select, SelectItem } from "@carbon/react";
import { Building } from "@carbon/icons-react";
import LogoUpload from "./LogoUpload";
import type { SchoolType } from "../../services/school";

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
        <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Building size={16} style={{ fill: "#406AAF" }} /> School Information
        </h2>
      </div>
      <div className="os-section__body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <TextInput
            id="school-name"
            labelText="School Name"
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
          <div style={{ gridColumn: "1 / -1" }}>
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
            labelText="School Type"
            helperText="Single-sex schools enforce matching student gender on enrollment."
            value={values.school_type}
            disabled={!editing}
            onChange={e => onChange("school_type", e.target.value)}
          >
            <SelectItem value="mixed" text="Mixed" />
            <SelectItem value="boys" text="Boys" />
            <SelectItem value="girls" text="Girls" />
          </Select>
          <div style={{ gridColumn: "1 / -1" }}>
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
