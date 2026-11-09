import { useState } from "react";
import { Link } from "react-router";
import { Alert, Button, Input, Select } from "antd";
import { useForgotPassword } from "@/features/auth/queries/useAuth";
import type { SelfServiceResetRole } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/api/errors";
import AuthCard from "@/shared/ui/AuthCard";
import Field from "@/shared/ui/Field";
import LinkButton from "@/shared/ui/LinkButton";

const ROLES: { value: SelfServiceResetRole; label: string; secretLabel: string; secretHelp: string }[] = [
  { value: "teacher", label: "Teacher", secretLabel: "NIC number", secretHelp: "Your NIC number, as set when your account was created." },
  { value: "student", label: "Student", secretLabel: "Index number", secretHelp: "Your school index number." },
  { value: "parent", label: "Guardian", secretLabel: "NIC number", secretHelp: "Your NIC number, as set when your account was created." },
];

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();

  const [role, setRole] = useState<SelfServiceResetRole>("teacher");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");

  const roleInfo = ROLES.find((r) => r.value === role)!;
  const canVerify = identifier.trim().length > 0 && secret.trim().length > 0;

  const handleVerify = () => {
    if (!canVerify) return;
    forgotPassword.mutate({ role, identifier: identifier.trim(), secret: secret.trim() });
  };

  if (forgotPassword.isSuccess) {
    return (
      <AuthCard
        success
        title="Check your email"
        subtitle="If those details match an account, a password reset link has been sent to the email on file. The link expires in 15 minutes."
      >
        <LinkButton to="/signin" type="primary" size="large" block>Back to sign in</LinkButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Confirm who you are and we'll email you a reset link. Admins, ask another administrator."
      footer={<Link to="/signin">Back to sign in</Link>}
    >
      {forgotPassword.isError && (
        <Alert
          type="error"
          showIcon
          className="os-mb-5"
          title="Could not verify identity"
          description={getErrorMessage(forgotPassword.error, "Please check your details and try again.")}
        />
      )}
      <form className="os-login__form" onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
        <Field id="forgot-password-role" label="I am a">
          <Select
            id="forgot-password-role"
            size="large"
            value={role}
            onChange={setRole}
            options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
          />
        </Field>
        <Field id="forgot-password-identifier" label="Email address">
          <Input
            id="forgot-password-identifier"
            size="large"
            type="email"
            autoComplete="email"
            placeholder="e.g. user@school.edu"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>
        <Field id="forgot-password-secret" label={roleInfo.secretLabel} helper={roleInfo.secretHelp}>
          <Input
            id="forgot-password-secret"
            size="large"
            placeholder={`Enter your ${roleInfo.secretLabel}`}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </Field>
        <Button type="primary" htmlType="submit" size="large" block loading={forgotPassword.isPending} disabled={!canVerify}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
