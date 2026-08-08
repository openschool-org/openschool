import { useState } from "react";
import { Link } from "react-router";
import {
  Button,
  TextInput,
  PasswordInput,
  Select,
  SelectItem,
  InlineNotification,
} from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useForgotPassword, useResetPassword } from "../queries/useAuth";
import type { SelfServiceResetRole } from "../services/auth";
import { getErrorMessage } from "../lib/errorMessage";

const ROLES: { value: SelfServiceResetRole; label: string; secretLabel: string; secretHelp: string }[] = [
  { value: "teacher", label: "Teacher", secretLabel: "NIC Number", secretHelp: "Your NIC number, as set when your account was created." },
  { value: "student", label: "Student", secretLabel: "Index Number", secretHelp: "Your school index number." },
  { value: "parent", label: "Parent / Guardian", secretLabel: "NIC Number", secretHelp: "Your NIC number, as set when your account was created." },
];

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  const [role, setRole] = useState<SelfServiceResetRole>("teacher");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const roleInfo = ROLES.find((r) => r.value === role)!;

  const canVerify = identifier.trim().length > 0 && secret.trim().length > 0;
  const canReset = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleVerify = () => {
    if (!canVerify) return;
    forgotPassword.mutate({ role, identifier: identifier.trim(), secret: secret.trim() });
  };

  const handleReset = () => {
    if (!canReset || !forgotPassword.data) return;
    resetPassword.mutate(
      { token: forgotPassword.data.reset_token, new_password: newPassword },
      { onSuccess: () => setDone(true) },
    );
  };

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-setup-card" style={{ textAlign: "center" }}>
          <div className="os-setup-success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-setup-card__title">Password updated</h1>
          <p className="os-setup-card__subtitle">
            You can now sign in with your new password.
          </p>
          <Button href="/signin" className="os-full-width-btn">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-setup-card">
        <h1 className="os-setup-card__title">Forgot password</h1>
        <p className="os-setup-card__subtitle">
          {forgotPassword.data
            ? "Identity verified — choose a new password."
            : "Verify your identity to reset your password. Admin accounts should contact another administrator instead."}
        </p>

        {!forgotPassword.data ? (
          <>
            {forgotPassword.isError && (
              <InlineNotification
                kind="error"
                title="Could not verify identity"
                subtitle={getErrorMessage(forgotPassword.error, "Please check your details and try again.")}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div style={{ display: "grid", gap: "1rem" }}>
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
                labelText="Email Address"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <TextInput
                id="forgot-password-secret"
                labelText={roleInfo.secretLabel}
                helperText={roleInfo.secretHelp}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>
            <Button
              className="os-full-width-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={handleVerify}
              disabled={!canVerify || forgotPassword.isPending}
            >
              {forgotPassword.isPending ? "Verifying…" : "Verify identity"}
            </Button>
          </>
        ) : (
          <>
            {resetPassword.isError && (
              <InlineNotification
                kind="error"
                title="Could not reset password"
                subtitle={getErrorMessage(resetPassword.error, "The verification link expired — start again.")}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div style={{ display: "grid", gap: "1rem" }}>
              <PasswordInput
                id="forgot-password-new"
                labelText="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={newPassword.length > 0 && newPassword.length < 8}
                invalidText="Must be at least 8 characters."
              />
              <PasswordInput
                id="forgot-password-confirm"
                labelText="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={confirmPassword.length > 0 && confirmPassword !== newPassword}
                invalidText="Passwords do not match."
              />
            </div>
            <Button
              className="os-full-width-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={handleReset}
              disabled={!canReset || resetPassword.isPending}
            >
              {resetPassword.isPending ? "Saving…" : "Set new password"}
            </Button>
          </>
        )}

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          <Link to="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
