import { useState } from "react";
import { Link } from "react-router";
import { Button, Input, Select } from "antd";
import { useActivationStatus, useStartActivation } from "@/features/activation/queries/useActivation";
import type { ActivationRole } from "@/features/activation/api/activation";
import AuthCard from "@/shared/ui/AuthCard";
import Field from "@/shared/ui/Field";
import LinkButton from "@/shared/ui/LinkButton";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { EMAIL_RE } from "@/shared/lib/validation";

const ROLES: { value: ActivationRole; label: string; idLabel: string; idHelp: string }[] = [
  { value: "student", label: "Student", idLabel: "Index number", idHelp: "Your school index number." },
  { value: "parent", label: "Guardian", idLabel: "NIC number", idHelp: "The NIC number the school has for you." },
];

export default function ActivateStartForm() {
  const { data: status, isLoading } = useActivationStatus();
  const start = useStartActivation();
  const [chosenRole, setChosenRole] = useState<ActivationRole | null>(null);
  const [code, setCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");

  const openRoles = ROLES.filter((r) => status?.[r.value]);
  const role = openRoles.find((r) => r.value === chosenRole) ?? openRoles[0];
  const emailInvalid = email.trim() !== "" && !EMAIL_RE.test(email.trim());
  const canSubmit = !!role && code.trim() !== "" && identifier.trim() !== "" && email.trim() !== "" && !emailInvalid;

  const submit = () => {
    if (!canSubmit || !role) return;
    start.mutate({ role: role.value, code: code.trim(), identifier: identifier.trim(), email: email.trim() });
  };

  if (isLoading) return <LoadingSpinner />;

  if (start.isSuccess) {
    return (
      <AuthCard
        success
        title="Check your email"
        subtitle="If the code and details match, we have sent a link to finish activating your account. It expires in 30 minutes. No email after a few minutes? Check the code and your index or NIC number, then try again."
      >
        <LinkButton to="/signin" type="primary" size="large" block>Back to sign in</LinkButton>
      </AuthCard>
    );
  }

  if (!role) {
    return (
      <AuthCard
        title="Activate your account"
        subtitle="Account activation is not open right now. Please contact the school office."
        footer={<Link to="/signin">Back to sign in</Link>}
      />
    );
  }

  return (
    <AuthCard
      title="Activate your account"
      subtitle="Use the activation code from your school to create your login."
      footer={<span>Already activated? <Link to="/signin">Sign in</Link></span>}
    >
      <MutationErrorNotification isError={start.isError} error={start.error} title="Could not start activation" />
      <form className="os-login__form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {openRoles.length > 1 && (
          <Field id="activate-role" label="I am a">
            <Select
              id="activate-role"
              size="large"
              value={role.value}
              onChange={setChosenRole}
              options={openRoles.map((r) => ({ value: r.value, label: r.label }))}
            />
          </Field>
        )}
        <Field id="activate-code" label="Activation code">
          <Input id="activate-code" size="large" placeholder="XXXXX-XXXXX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field id="activate-identifier" label={role.idLabel} helper={role.idHelp}>
          <Input id="activate-identifier" size="large" autoComplete="off" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </Field>
        <Field
          id="activate-email"
          label="Your email"
          helper="We will send a link here. You will use it for password resets too."
          error={emailInvalid ? "Enter a valid email address." : undefined}
        >
          <Input
            id="activate-email"
            size="large"
            type="email"
            autoComplete="email"
            value={email}
            status={emailInvalid ? "error" : undefined}
            aria-invalid={emailInvalid || undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="primary" htmlType="submit" size="large" block loading={start.isPending} disabled={!canSubmit}>
          Send activation link
        </Button>
      </form>
    </AuthCard>
  );
}
