import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { useCompleteActivation } from "@/features/activation/queries/useActivation";
import AuthShell from "@/features/activation/components/AuthShell";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

export default function ActivateCompleteForm({ token }: { token: string }) {
  const complete = useCompleteActivation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const canSave = validateNewPassword(password, confirm).valid;

  const save = () => {
    if (canSave) complete.mutate({ token, new_password: password });
  };

  if (complete.isSuccess) {
    return (
      <AuthShell success title="Account activated" subtitle="You can now sign in with your new password.">
        <Button href="/signin" className="os-full-width-btn">Go to sign in</Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose your password" subtitle="This finishes activating your account. Do not use your index or NIC number.">
      <MutationErrorNotification isError={complete.isError} error={complete.error} title="Could not activate your account" />
      <div className="os-auth-card__form">
        <PasswordFields idPrefix="activate-password" password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
      </div>
      <div className="os-auth-card__actions">
        <Button className="os-full-width-btn" onClick={save} disabled={!canSave || complete.isPending}>
          {complete.isPending ? "Activating…" : "Activate account"}
        </Button>
      </div>
      <div className="os-auth-card__footer"><a href="/activate">Start again</a> · <Link to="/signin">Back to sign in</Link></div>
    </AuthShell>
  );
}
