import { Input } from "antd";
import Field from "@/shared/ui/Field";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  invalidText?: string;
  helperText?: string;
  disabled?: boolean;
}

// Labelled multi-line input for forms that are not antd Forms.
export default function TextAreaField({ id, label, value, onChange, rows = 3, placeholder, maxLength, invalid, invalidText, helperText, disabled }: Props) {
  return (
    <Field id={id} label={label} error={invalid ? invalidText : undefined} helper={helperText}>
      <Input.TextArea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        showCount={!!maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        status={invalid ? "error" : undefined}
        aria-invalid={invalid || undefined}
      />
    </Field>
  );
}
