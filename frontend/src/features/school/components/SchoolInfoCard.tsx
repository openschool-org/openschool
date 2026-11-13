import { Descriptions } from "antd";
import type { SchoolType } from "@/features/school/api/school";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

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

const TYPES = [
  { value: "mixed", label: "Mixed" },
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
];

// Read-only facts until Edit; then the same fields as inputs. The card chrome is the caller's.
export default function SchoolInfoCard({ values, editing, onChange }: SchoolInfoCardProps) {
  if (!editing) {
    const dash = (v: string) => v || "-";
    return (
      <Descriptions
        className="os-facts"
        layout="vertical"
        column={{ xs: 1, sm: 2 }}
        items={[
          { key: "name", label: "School name", children: dash(values.name) },
          { key: "type", label: "School type", children: TYPES.find((t) => t.value === values.school_type)?.label ?? "-" },
          { key: "email", label: "Email", children: dash(values.email) },
          { key: "phone", label: "Phone", children: dash(values.phone) },
          { key: "address", label: "Address", span: "filled", children: dash(values.address) },
        ]}
      />
    );
  }
  return (
    <div className="os-settings-grid">
      <TextField id="school-name" label="School name" value={values.name} onChange={(v) => onChange("name", v)} invalid={!values.name.trim()} invalidText="Required." />
      <SelectField
        id="school-type"
        label="School type"
        helperText="Single-sex schools check student gender on enrolment."
        value={values.school_type}
        onChange={(v) => onChange("school_type", v)}
        options={TYPES}
      />
      <TextField id="school-email" label="Email" type="email" value={values.email} onChange={(v) => onChange("email", v)} />
      <TextField id="school-phone" label="Phone" value={values.phone} onChange={(v) => onChange("phone", v)} />
      <div className="os-col-span-full">
        <TextField id="school-address" label="Address" value={values.address} onChange={(v) => onChange("address", v)} />
      </div>
    </div>
  );
}
