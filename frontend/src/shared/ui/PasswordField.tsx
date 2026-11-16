import { Input } from "antd";
import type { PasswordProps } from "antd/es/input";
import Field from "@/shared/ui/Field";

type Props = Omit<PasswordProps, "onChange" | "value" | "id" | "status"> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  invalidText?: string;
  helperText?: string;
};

// Labelled password input for forms that are not antd Forms.
export default function PasswordField({ id, label, value, onChange, invalid, invalidText, helperText, ...rest }: Props) {
  return (
    <Field id={id} label={label} error={invalid ? invalidText : undefined} helper={helperText}>
      <Input.Password
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        status={invalid ? "error" : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
    </Field>
  );
}
