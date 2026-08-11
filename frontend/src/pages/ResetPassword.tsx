import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, PasswordInput, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useResetPassword } from "../queries/useAuth";
import { getErrorMessage } from "../lib/errorMessage";

// Landing page for the link emailed by ForgotPassword.tsx — the token lives
// in the URL query string, never in a value the app itself displays back.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const canReset = token.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleReset = () => {
    if (!canReset) return;
    resetPassword.mutate({ token, new_password: newPassword }, { onSuccess: () => setDone(true) });
  };

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-setup-card" style={{ textAlign: "center" }}>
          <div className="os-setup-success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-setup-card__title">Password updated</h1>
          <p className="os-setup-card__subtitle">You can now sign in with your new password.</p>
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
        <h1 className="os-setup-card__title">Reset password</h1>
        <p className="os-setup-card__subtitle">Choose a new password for your account.</p>

        {!token && (
          <InlineNotification
            kind="error"
            title="Invalid reset link"
            subtitle="This link is missing its reset token. Request a new one below."
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        {resetPassword.isError && (
          <InlineNotification
            kind="error"
            title="Could not reset password"
            subtitle={getErrorMessage(resetPassword.error, "The reset link is invalid, already used, or has expired.")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          <PasswordInput
            id="reset-password-new"
            labelText="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            invalid={newPassword.length > 0 && newPassword.length < 8}
            invalidText="Must be at least 8 characters."
          />
          <PasswordInput
            id="reset-password-confirm"
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

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          <Link to="/forgot-password">Request a new link</Link> · <Link to="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
