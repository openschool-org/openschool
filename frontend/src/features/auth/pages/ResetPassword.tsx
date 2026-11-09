import { useState } from "react";
import { Link } from "react-router";
import { Alert, Button } from "antd";
import { useResetPassword } from "@/features/auth/queries/useAuth";
import { validateNewPassword } from "@/shared/auth/password";
import AuthCard from "@/shared/ui/AuthCard";
import LinkButton from "@/shared/ui/LinkButton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";
import { tokenFromHash } from "@/shared/lib/urlHash";

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
      <AuthCard success title="Password updated" subtitle="You can now sign in with your new password.">
        <LinkButton to="/signin" type="primary" size="large" block>Go to sign in</LinkButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          <Link to="/forgot-password">Request a new link</Link>
          <Link to="/signin">Back to sign in</Link>
        </>
      }
    >
      {!token && (
        <Alert
          type="error"
          showIcon
          className="os-mb-4"
          title="Invalid reset link"
          description="This link is missing its reset token. Request a new one below."
        />
      )}
      <MutationErrorNotification
        isError={resetPassword.isError}
        error={resetPassword.error}
        title="Could not reset password"
        fallback="The reset link is invalid, already used, or has expired."
      />
      <form className="os-login__form" onSubmit={(e) => { e.preventDefault(); handleReset(); }}>
        <PasswordFields
          idPrefix="reset-password"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        <Button type="primary" htmlType="submit" size="large" block loading={resetPassword.isPending} disabled={!canReset}>
          Set new password
        </Button>
      </form>
    </AuthCard>
  );
}
