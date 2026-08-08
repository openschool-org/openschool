import { useState } from "react";
import { Button, PasswordInput, InlineNotification } from "@carbon/react";
import { useThunderID } from "@thunderid/react";
import { useChangePassword, useKeepDefaultPassword } from "../queries/useAuth";
import { getErrorMessage } from "../lib/errorMessage";

// Phase 8.3 — interrupts first sign-in when the account is still on its
// system-assigned default password (NIC/index number). Neither choice is
// silently skippable: the user must explicitly keep it or set a new one.
export default function PasswordInterstitial() {
  const { signOut } = useThunderID();
  const keepDefault = useKeepDefaultPassword();
  const changePassword = useChangePassword();

  const [settingNew, setSettingNew] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = () => {
    if (!canSubmit) return;
    changePassword.mutate(newPassword);
  };

  return (
    <div className="os-signin-wrapper">
      <div className="os-setup-card">
        <h1 className="os-setup-card__title">One-time password</h1>
        <p className="os-setup-card__subtitle">
          You signed in with a system-assigned password. Keep it, or set a new one now.
        </p>

        {!settingNew ? (
          <>
            {keepDefault.isError && (
              <InlineNotification
                kind="error"
                title="Something went wrong"
                subtitle={getErrorMessage(keepDefault.error, "Please try again.")}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <Button
                className="os-full-width-btn"
                kind="secondary"
                onClick={() => keepDefault.mutate()}
                disabled={keepDefault.isPending}
              >
                {keepDefault.isPending ? "Saving…" : "Keep this password"}
              </Button>
              <Button className="os-full-width-btn" onClick={() => setSettingNew(true)}>
                Set a new password
              </Button>
            </div>
          </>
        ) : (
          <>
            {changePassword.isError && (
              <InlineNotification
                kind="error"
                title="Could not update password"
                subtitle={getErrorMessage(changePassword.error, "Please try again.")}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div style={{ display: "grid", gap: "1rem" }}>
              <PasswordInput
                id="interstitial-new-password"
                labelText="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={newPassword.length > 0 && newPassword.length < 8}
                invalidText="Must be at least 8 characters."
              />
              <PasswordInput
                id="interstitial-confirm-password"
                labelText="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={confirmPassword.length > 0 && confirmPassword !== newPassword}
                invalidText="Passwords do not match."
              />
            </div>
            <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Button onClick={handleSubmit} disabled={!canSubmit || changePassword.isPending}>
                {changePassword.isPending ? "Saving…" : "Save new password"}
              </Button>
              <Button kind="ghost" onClick={() => setSettingNew(false)}>
                Back
              </Button>
            </div>
          </>
        )}

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          <Button kind="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </p>
      </div>
    </div>
  );
}
