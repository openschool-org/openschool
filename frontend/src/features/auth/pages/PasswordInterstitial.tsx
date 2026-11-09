import { useState } from "react";
import { Button } from "antd";
import { useThunderID } from "@thunderid/react";
import { useChangePassword, useKeepDefaultPassword } from "@/features/auth/queries/useAuth";
import { useProvisionUser } from "@/shared/auth/useProvisionUser";
import { validateNewPassword } from "@/shared/auth/password";
import AuthCard from "@/shared/ui/AuthCard";
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

  const save = () => {
    if (valid) changePassword.mutate(password);
  };

  return (
    <AuthCard
      title="One-time password"
      subtitle={
        keepAllowed
          ? "You signed in with a system-assigned password. Keep it, or set a new one now."
          : "You've kept your system-assigned password for too long. Set a new password to continue."
      }
      footer={
        <span>
          Not your account?{" "}
          <Button type="link" className="os-login__inline-link" onClick={() => signOut()}>Sign out</Button>
        </span>
      }
    >
      {!settingNew && keepAllowed ? (
        <>
          <MutationErrorNotification isError={keepDefault.isError} error={keepDefault.error} title="Something went wrong" fallback="Please try again." />
          <div className="os-login__form">
            <Button type="primary" size="large" block onClick={() => setSettingNew(true)}>Change password</Button>
            <Button size="large" block loading={keepDefault.isPending} onClick={() => keepDefault.mutate()}>Keep current password</Button>
          </div>
        </>
      ) : (
        <>
          <MutationErrorNotification isError={changePassword.isError} error={changePassword.error} title="Could not update password" fallback="Please try again." />
          <form className="os-login__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <PasswordFields
              idPrefix="interstitial-password"
              password={password}
              confirm={confirm}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirm}
            />
            <Button type="primary" htmlType="submit" size="large" block loading={changePassword.isPending} disabled={!valid}>
              Save new password
            </Button>
            {keepAllowed && <Button type="text" size="large" block onClick={() => setSettingNew(false)}>Back</Button>}
          </form>
        </>
      )}
    </AuthCard>
  );
}
