import { Input } from "antd";
import type { InputProps } from "antd";
import Field from "@/shared/ui/Field";

type Props = Omit<InputProps, "onChange" | "value" | "id" | "status"> & {
  id: string;
  label: string;
  hideLabel?: boolean;
  value: string;
  // Omit for read-only fields.
  onChange?: (value: string) => void;
  invalid?: boolean;
  invalidText?: string;
  helperText?: string;
};

// Labelled text input for forms that are not antd Forms.
export default function TextField({ id, label, hideLabel, value, onChange, invalid, invalidText, helperText, ...rest }: Props) {
  return (
    <Field id={id} label={label} hideLabel={hideLabel} error={invalid ? invalidText : undefined} helper={helperText}>
      <Input
        {...rest}
        id={id}
        value={value}
        onChange={onChange && ((e) => onChange(e.target.value))}
        status={invalid ? "error" : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-label={hideLabel ? label : undefined}
      />
    </Field>
  );
}
