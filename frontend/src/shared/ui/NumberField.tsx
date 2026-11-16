import { InputNumber } from "antd";
import Field from "@/shared/ui/Field";

interface Props {
  id: string;
  label: string;
  hideLabel?: boolean;
  // null when the input is empty.
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: string;
  helperText?: string;
  disabled?: boolean;
  size?: "small" | "middle" | "large";
  onBlur?: () => void;
}

// Labelled number input for forms that are not antd Forms.
export default function NumberField({ id, label, hideLabel, value, onChange, min, max, step, placeholder, invalid, invalidText, helperText, disabled, size, onBlur }: Props) {
  return (
    <Field id={id} label={label} hideLabel={hideLabel} error={invalid ? invalidText : undefined} helper={helperText}>
      <InputNumber
        id={id}
        className="os-w-full"
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        size={size}
        status={invalid ? "error" : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-label={hideLabel ? label : undefined}
        onChange={(v) => onChange(typeof v === "number" ? v : null)}
        onBlur={onBlur}
      />
    </Field>
  );
}
