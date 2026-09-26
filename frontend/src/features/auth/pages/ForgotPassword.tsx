import { useState } from "react";
import { Link } from "react-router";
import { Button, TextInput, Select, SelectItem, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useForgotPassword } from "@/features/auth/queries/useAuth";
import type { SelfServiceResetRole } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/api/errors";

const ROLES: { value: SelfServiceResetRole; label: string; secretLabel: string; secretHelp: string }[] = [
  { value: "teacher", label: "Teacher", secretLabel: "NIC number", secretHelp: "Your NIC number, as set when your account was created." },
  { value: "student", label: "Student", secretLabel: "Index number", secretHelp: "Your school index number." },
  { value: "parent", label: "Parent / guardian", secretLabel: "NIC number", secretHelp: "Your NIC number, as set when your account was created." },
];

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();

  const [role, setRole] = useState<SelfServiceResetRole>("teacher");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");

  const roleInfo = ROLES.find((r) => r.value === role)!;
  const canVerify = identifier.trim().length > 0 && secret.trim().length > 0;

  const handleVerify = () => {
    if (!canVerify) return;
    forgotPassword.mutate({ role, identifier: identifier.trim(), secret: secret.trim() });
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-auth-card os-auth-card--center">
          <div className="os-auth-card__success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-auth-card__title">Check your email</h1>
          <p className="os-auth-card__subtitle">
            If those details match an account, a password reset link has been sent to the email on file.
            The link expires in 15 minutes.
          </p>
          <Button href="/signin" className="os-full-width-btn">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-auth-card">
        <div className="os-auth-card__brand">
          <img
            src="/favicon.webp"
            alt="OpenSchool"
            width={36}
            height={36}
            className="os-auth-card__logo"
          />
          <span className="os-auth-card__brand-name">OpenSchool</span>
        </div>
        <h1 className="os-auth-card__title">Forgot password</h1>
        <p className="os-auth-card__subtitle">
          Verify your identity to receive a password reset link by email. Admin accounts should contact
          another administrator instead.
        </p>

        {forgotPassword.isError && (
          <InlineNotification
            kind="error"
            title="Could not verify identity"
            subtitle={getErrorMessage(forgotPassword.error, "Please check your details and try again.")}
            lowContrast
            hideCloseButton className="os-mb-5 os-max-w-full"
          />
        )}

        <div className="os-auth-card__form">
          <Select
            id="forgot-password-role"
            labelText="I am a"
            value={role}
            onChange={(e) => setRole(e.target.value as SelfServiceResetRole)}
          >
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.label} />
            ))}
          </Select>
          <TextInput
            id="forgot-password-identifier"
            labelText="Email address"
            placeholder="e.g. user@school.edu"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <TextInput
            id="forgot-password-secret"
            labelText={roleInfo.secretLabel}
            helperText={roleInfo.secretHelp}
            placeholder={`Enter your ${roleInfo.secretLabel}`}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>

        <div className="os-auth-card__actions">
          <Button
            className="os-full-width-btn"
            onClick={handleVerify}
            disabled={!canVerify || forgotPassword.isPending}
          >
            {forgotPassword.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </div>

        <div className="os-auth-card__footer">
          <Link to="/signin">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
