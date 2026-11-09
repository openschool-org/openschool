import { useState } from "react";
import { Link } from "react-router";
import { Button } from "antd";
import { useCompleteActivation } from "@/features/activation/queries/useActivation";
import { validateNewPassword } from "@/shared/auth/password";
import AuthCard from "@/shared/ui/AuthCard";
import LinkButton from "@/shared/ui/LinkButton";
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
      <AuthCard success title="Account activated" subtitle="You can now sign in with your new password.">
        <LinkButton to="/signin" type="primary" size="large" block>Go to sign in</LinkButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose your password"
      subtitle="This finishes activating your account. Do not use your index or NIC number."
      footer={
        <>
          <a href="/activate">Start again</a>
          <Link to="/signin">Back to sign in</Link>
        </>
      }
    >
      <MutationErrorNotification isError={complete.isError} error={complete.error} title="Could not activate your account" />
      <form className="os-login__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <PasswordFields idPrefix="activate-password" password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
        <Button type="primary" htmlType="submit" size="large" block loading={complete.isPending} disabled={!canSave}>
          Activate account
        </Button>
      </form>
    </AuthCard>
  );
}
