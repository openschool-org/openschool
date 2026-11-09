import { Input } from "antd";
import { validateNewPassword } from "@/shared/auth/password";
import Field from "@/shared/ui/Field";
import PasswordRequirements from "@/shared/ui/PasswordRequirements";

interface Props {
  idPrefix: string;
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}

export default function PasswordFields({ idPrefix, password, confirm, onPasswordChange, onConfirmChange }: Props) {
  const { passwordError, confirmError } = validateNewPassword(password, confirm);
  const newId = `${idPrefix}-new`;
  const confirmId = `${idPrefix}-confirm`;
  return (
    <div className="os-stack os-gap-4">
      <Field id={newId} label="New password" error={passwordError}>
        <Input.Password
          id={newId}
          size="large"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          status={passwordError ? "error" : undefined}
          aria-invalid={!!passwordError || undefined}
          aria-describedby={passwordError ? `${newId}-error` : undefined}
        />
      </Field>
      <Field id={confirmId} label="Confirm new password" error={confirmError}>
        <Input.Password
          id={confirmId}
          size="large"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          status={confirmError ? "error" : undefined}
          aria-invalid={!!confirmError || undefined}
          aria-describedby={confirmError ? `${confirmId}-error` : undefined}
        />
      </Field>
      <PasswordRequirements password={password} confirm={confirm} />
    </div>
  );
}
