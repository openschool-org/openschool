import { Checkbox, FilterableMultiSelect, Select, SelectItem, TextInput } from "@carbon/react";
import type { InputField, Inputs } from "@/features/workflows/api/workflows";
import DateField from "@/shared/ui/DateField";

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
              <Select key={f.key} id={id} labelText={f.label} helperText={f.help} value={value} onChange={(e) => onChange(f.key, e.target.value)}>
                <SelectItem value="" text="Choose…" />
                {f.options?.map((o) => <SelectItem key={o.value} value={o.value} text={o.label} />)}
              </Select>
            );
          case "multiselect": {
            const selected = value ? value.split(",") : [];
            return (
              <FilterableMultiSelect
                key={f.key}
                id={id}
                titleText={f.label}
                helperText={f.help}
                items={f.options ?? []}
                itemToString={(o) => o?.label ?? ""}
                initialSelectedItems={(f.options ?? []).filter((o) => selected.includes(o.value))}
                onChange={({ selectedItems }) => onChange(f.key, (selectedItems ?? []).map((o) => o.value).join(","))}
              />
            );
          }
          case "date":
            return <DateField key={f.key} id={id} labelText={f.label} value={value} onChange={(v) => onChange(f.key, v)} />;
          case "boolean":
            return (
              <div key={f.key} className="os-workflow-inputs__check">
                <Checkbox id={id} labelText={f.label} checked={value === "true"} onChange={(_, { checked }) => onChange(f.key, String(checked))} />
                {f.help && <p className="os-m-0 os-text-xs os-c-tertiary">{f.help}</p>}
              </div>
            );
          default:
            return <TextInput key={f.key} id={id} labelText={f.label} helperText={f.help} value={value} onChange={(e) => onChange(f.key, e.target.value)} />;
        }
      })}
    </div>
  );
}
