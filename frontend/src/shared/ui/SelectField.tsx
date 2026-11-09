import type { ReactNode } from "react";
import { Select } from "antd";
import Field from "@/shared/ui/Field";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface Props {
  id: string;
  label: ReactNode;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  invalidText?: string;
  helperText?: string;
  disabled?: boolean;
  showSearch?: boolean;
  size?: "small" | "middle" | "large";
  className?: string;
}

// Labelled single select for forms and filter bars that are not antd Forms.
export default function SelectField({ id, label, hideLabel, value, onChange, options, placeholder, invalid, invalidText, helperText, disabled, showSearch, size, className }: Props) {
  return (
    <Field id={id} label={label} hideLabel={hideLabel} error={invalid ? invalidText : undefined} helper={helperText} className={className}>
      <Select
        id={id}
        className="os-w-full"
        value={value === "" && placeholder && !options.some((o) => o.value === "") ? undefined : value}
        onChange={(v: string) => onChange(v ?? "")}
        options={options}
        placeholder={placeholder}
        status={invalid ? "error" : undefined}
        disabled={disabled}
        size={size}
        showSearch={showSearch ? { filterOption: (input, option) => String(option?.label ?? "").toLowerCase().includes(input.trim().toLowerCase()) } : undefined}
        aria-label={hideLabel && typeof label === "string" ? label : undefined}
      />
    </Field>
  );
}
