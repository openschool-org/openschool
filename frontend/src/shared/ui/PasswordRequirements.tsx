import { CheckmarkFilled, Information } from "@carbon/icons-react";
import { validateNewPassword } from "@/shared/auth/password";

interface Props {
  password: string;
  confirm: string;
}

export default function PasswordRequirements({ password, confirm }: Props) {
  const { criteria } = validateNewPassword(password, confirm);
  if (!password && !confirm) return null;

  const checks = [
    [criteria.minLength, "At least 10 characters"],
    [criteria.uppercase, "One uppercase letter"],
    [criteria.lowercase, "One lowercase letter"],
    [criteria.number, "One number"],
    [criteria.special, "One special character"],
    [criteria.notCommon, "No simple patterns, like 123456"],
    [criteria.minLength && confirm.length > 0 && confirm === password, "Passwords match"],
  ] as const;

  return (
    <div className="os-password-guidance" aria-live="polite">
      <div className="os-password-guidance__title"><Information size={16} /> Password requirements</div>
      <div className="os-password-guidance__checks">
        {checks.map(([valid, label]) => (
          <span key={label} className={valid ? "is-valid" : "is-invalid"}>
            <CheckmarkFilled size={16} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
