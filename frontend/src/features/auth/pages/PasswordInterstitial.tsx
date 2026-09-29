import { useState } from "react";
import { Button } from "@carbon/react";
import { Security } from "@carbon/icons-react";
import { useThunderID } from "@thunderid/react";
import { useChangePassword, useKeepDefaultPassword } from "@/features/auth/queries/useAuth";
import { useProvisionUser } from "@/shared/auth/useProvisionUser";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

// First sign-in with a system-assigned password: keep it or set a new one.
// Once a prior "keep it" choice has expired (S1), "keep it" is no longer
// offered - the account must actually set a new password.
export default function PasswordInterstitial() {
  const { signOut } = useThunderID();
  const { data: me } = useProvisionUser();
  const keepDefault = useKeepDefaultPassword();
  const changePassword = useChangePassword();
  const [settingNew, setSettingNew] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { valid } = validateNewPassword(password, confirm);
  const keepAllowed = !me?.default_password_expired;

  return (
    <div className="os-setup-wrapper os-otp-wrapper">
      <div className="os-otp-shell">
        <header className="os-setup-header" aria-label="OpenSchool">
          <img src="/favicon.webp" alt="" width={44} height={44} className="os-setup-header__logo" />
          <p className="os-setup-header__title">Open<span className="os-signin-card__title-accent">School</span></p>
        </header>

        <main className="os-setup-card os-otp-content" aria-labelledby="otp-title">
          <div className="os-otp-heading">
            <span className="os-otp-heading__icon" aria-hidden="true"><Security size={24} /></span>
            <div>
              <p className="os-otp-eyebrow">Account security</p>
              <h1 id="otp-title">One-time password</h1>
            </div>
          </div>
          <p className="os-otp-subtitle">
            {keepAllowed
              ? "You signed in with a system-assigned password. Keep it, or set a new one now."
              : "You've kept your system-assigned password for too long. Set a new password to continue."}
          </p>

          {!settingNew && keepAllowed ? (
            <>
              <MutationErrorNotification isError={keepDefault.isError} error={keepDefault.error} title="Something went wrong" fallback="Please try again." />
              <div className="os-otp-options">
                <div className="os-otp-option">
                  <Button kind="secondary" className="os-full-width-btn" onClick={() => keepDefault.mutate()} disabled={keepDefault.isPending}>
                    {keepDefault.isPending ? "Saving…" : "Keep password"}
                  </Button>
                </div>
                <div className="os-otp-option os-otp-option--primary">
                  <Button className="os-full-width-btn" onClick={() => setSettingNew(true)}>Change password</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <MutationErrorNotification isError={changePassword.isError} error={changePassword.error} title="Could not update password" fallback="Please try again." />
              <div className="os-otp-form">
                <PasswordFields
                  idPrefix="interstitial-password"
                  password={password}
                  confirm={confirm}
                  onPasswordChange={setPassword}
                  onConfirmChange={setConfirm}
                />
                <div className="os-otp-form__actions">
                  <Button onClick={() => valid && changePassword.mutate(password)} disabled={!valid || changePassword.isPending}>
                    {changePassword.isPending ? "Saving…" : "Save new password"}
                  </Button>
                  {keepAllowed && <Button kind="ghost" onClick={() => setSettingNew(false)}>Back</Button>}
                </div>
              </div>
            </>
          )}

          <footer className="os-otp-footer">
            <span>Not your account?</span>
            <Button kind="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
          </footer>
        </main>
      </div>
    </div>
  );
}
