import { useState } from "react";
import { Link } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useResetPassword } from "@/features/auth/queries/useAuth";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

// The reset token travels in the URL fragment (#token=...), not a query
// string - a fragment is never sent to a server, so it can't land in the
// SPA host's or a proxy's access log the way a query string would (S5).
function tokenFromHash(): string {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash).get("token") ?? "";
}

export default function ResetPassword() {
  const [token] = useState(tokenFromHash);
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const canReset = token.length > 0 && validateNewPassword(password, confirm).valid;

  const handleReset = () => {
    if (canReset) resetPassword.mutate({ token, new_password: password }, { onSuccess: () => setDone(true) });
  };

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-auth-card os-auth-card--center">
          <div className="os-auth-card__success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-auth-card__title">Password updated</h1>
          <p className="os-auth-card__subtitle">You can now sign in with your new password.</p>
          <Button href="/signin" className="os-full-width-btn">Go to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-auth-card">
        <div className="os-auth-card__brand">
          <img src="/favicon.webp" alt="OpenSchool" width={36} height={36} className="os-auth-card__logo" />
          <span className="os-auth-card__brand-name">OpenSchool</span>
        </div>
        <h1 className="os-auth-card__title">Reset password</h1>
        <p className="os-auth-card__subtitle">Choose a new password for your account.</p>

        {!token && (
          <InlineNotification
            kind="error"
            title="Invalid reset link"
            subtitle="This link is missing its reset token. Request a new one below."
            lowContrast
            hideCloseButton
            className="os-full-width os-mb-4"
          />
        )}
        <MutationErrorNotification
          isError={resetPassword.isError}
          error={resetPassword.error}
          title="Could not reset password"
          fallback="The reset link is invalid, already used, or has expired."
        />
        <div className="os-auth-card__form">
          <PasswordFields
            idPrefix="reset-password"
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
          />
        </div>
        <div className="os-auth-card__actions">
          <Button className="os-full-width-btn" onClick={handleReset} disabled={!canReset || resetPassword.isPending}>
            {resetPassword.isPending ? "Saving…" : "Set new password"}
          </Button>
        </div>
        <div className="os-auth-card__footer">
          <Link to="/forgot-password">Request a new link</Link> · <Link to="/signin">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
