import { PasswordInput } from "@carbon/react";
import { validateNewPassword } from "@/shared/auth/password";

interface Props {
  idPrefix: string;
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}

export default function PasswordFields({ idPrefix, password, confirm, onPasswordChange, onConfirmChange }: Props) {
  const { passwordError, confirmError } = validateNewPassword(password, confirm);
  return (
    <div className="os-stack os-gap-4">
      <PasswordInput
        id={`${idPrefix}-new`}
        labelText="New password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        invalid={!!passwordError}
        invalidText={passwordError}
      />
      <PasswordInput
        id={`${idPrefix}-confirm`}
        labelText="Confirm new password"
        value={confirm}
        onChange={(e) => onConfirmChange(e.target.value)}
        invalid={!!confirmError}
        invalidText={confirmError}
      />
    </div>
  );
}
