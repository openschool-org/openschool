import { TextInput } from "@carbon/react";
import { Building } from "@carbon/icons-react";

export interface SchoolFormValues {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
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
          <TextInput
            id="school-logo"
            labelText="Logo URL"
            value={values.logo_url}
            readOnly={!editing}
            onChange={e => onChange("logo_url", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
