import { useState } from "react";
import { Button } from "@carbon/react";
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
    <div className="os-signin-wrapper">
      <div className="os-setup-card">
        <h1 className="os-setup-card__title">One-time password</h1>
        <p className="os-setup-card__subtitle">
          {keepAllowed
            ? "You signed in with a system-assigned password. Keep it, or set a new one now."
            : "You've kept your system-assigned password for too long. Set a new password to continue."}
        </p>

        {!settingNew && keepAllowed ? (
          <>
            <MutationErrorNotification isError={keepDefault.isError} error={keepDefault.error} title="Something went wrong" fallback="Please try again." />
            <div className="os-stack">
              <Button className="os-full-width-btn" kind="secondary" onClick={() => keepDefault.mutate()} disabled={keepDefault.isPending}>
                {keepDefault.isPending ? "Saving…" : "Keep this password"}
              </Button>
              <Button className="os-full-width-btn" onClick={() => setSettingNew(true)}>
                Set a new password
              </Button>
            </div>
          </>
        ) : (
          <>
            <MutationErrorNotification isError={changePassword.isError} error={changePassword.error} title="Could not update password" fallback="Please try again." />
            <PasswordFields
              idPrefix="interstitial-password"
              password={password}
              confirm={confirm}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirm}
            />
            <div className="os-stack os-mt-6">
              <Button onClick={() => valid && changePassword.mutate(password)} disabled={!valid || changePassword.isPending}>
                {changePassword.isPending ? "Saving…" : "Save new password"}
              </Button>
              {keepAllowed && <Button kind="ghost" onClick={() => setSettingNew(false)}>Back</Button>}
            </div>
          </>
        )}

        <p className="os-mt-6 os-text-center os-text-sm">
          <Button kind="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
        </p>
      </div>
    </div>
  );
}
