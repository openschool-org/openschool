import { Checkbox, Select } from "antd";
import type { InputField, Inputs } from "@/features/workflows/api/workflows";
import DateField from "@/shared/ui/DateField";
import CsvInput from "@/features/workflows/components/CsvInput";
import Field from "@/shared/ui/Field";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

interface Props {
  fields: InputField[];
  values: Inputs;
  onChange: (key: string, value: string) => void;
}

// Renders the form a workflow declares; the backend sends the fields, options and defaults.
export default function WorkflowInputs({ fields, values, onChange }: Props) {
  return (
    <div className="os-workflow-inputs">
      {fields.map((f) => {
        const id = `wf-${f.key}`;
        const value = values[f.key] ?? f.default ?? "";
        switch (f.type) {
          case "select":
            return (
              <SelectField key={f.key} id={id} label={f.label} helperText={f.help} placeholder="Choose…" value={value} onChange={(v) => onChange(f.key, v)} options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label }))} />
            );
          case "multiselect": {
            const selected = value ? value.split(",") : [];
            return (
              <Field key={f.key} id={id} label={f.label} helper={f.help}>
                <Select
                  id={id}
                  mode="multiple"
                  className="os-w-full"
                  showSearch={{ filterOption: (input, option) => String(option?.label ?? "").toLowerCase().includes(input.trim().toLowerCase()) }}
                  value={selected}
                  options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(vals: string[]) => onChange(f.key, vals.join(","))}
                />
              </Field>
            );
          }
          case "date":
            return <DateField key={f.key} id={id} labelText={f.label} value={value} onChange={(v) => onChange(f.key, v)} />;
          case "boolean":
            return (
              <div key={f.key} className="os-workflow-inputs__check">
                <Checkbox id={id} checked={value === "true"} onChange={(e) => onChange(f.key, String(e.target.checked))}>{f.label}</Checkbox>
                {f.help && <p className="os-m-0 os-text-xs os-c-tertiary">{f.help}</p>}
              </div>
            );
          case "csv":
            return <CsvInput key={f.key} id={id} label={f.label} help={f.help} template={f.template} value={value} onChange={(v) => onChange(f.key, v)} />;
          default:
            return <TextField key={f.key} id={id} label={f.label} helperText={f.help} value={value} onChange={(v) => onChange(f.key, v)} />;
        }
      })}
    </div>
  );
}
