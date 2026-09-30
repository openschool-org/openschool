import { useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, TextInput } from "@carbon/react";
import { useActivationStatus, useStartActivation } from "@/features/activation/queries/useActivation";
import type { ActivationRole } from "@/features/activation/api/activation";
import AuthShell from "@/features/activation/components/AuthShell";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { EMAIL_RE } from "@/shared/lib/validation";

const ROLES: { value: ActivationRole; label: string; idLabel: string; idHelp: string }[] = [
  { value: "student", label: "Student", idLabel: "Index number", idHelp: "Your school index number." },
  { value: "parent", label: "Parent / guardian", idLabel: "NIC number", idHelp: "The NIC number the school has for you." },
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
      <AuthShell success title="Check your email" subtitle="If the code and details match, we have sent a link to finish activating your account. It expires in 30 minutes.">
        <Button href="/signin" className="os-full-width-btn">Back to sign in</Button>
      </AuthShell>
    );
  }

  if (!role) {
    return (
      <AuthShell title="Activate your account" subtitle="Account activation is not open right now. Please contact the school office.">
        <div className="os-auth-card__footer"><Link to="/signin">Back to sign in</Link></div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Activate your account" subtitle="Use the activation code from your school to create your login.">
      <MutationErrorNotification isError={start.isError} error={start.error} title="Could not start activation" />
      <div className="os-auth-card__form">
        {openRoles.length > 1 && (
          <Select id="activate-role" labelText="I am a" value={role.value} onChange={(e) => setChosenRole(e.target.value as ActivationRole)}>
            {openRoles.map((r) => <SelectItem key={r.value} value={r.value} text={r.label} />)}
          </Select>
        )}
        <TextInput id="activate-code" labelText="Activation code" placeholder="XXXXX-XXXXX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextInput id="activate-identifier" labelText={role.idLabel} helperText={role.idHelp} autoComplete="off" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <TextInput
          id="activate-email"
          type="email"
          labelText="Your email"
          helperText="We will send a link here. You will use it for password resets too."
          autoComplete="email"
          value={email}
          invalid={emailInvalid}
          invalidText="Enter a valid email address."
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="os-auth-card__actions">
        <Button className="os-full-width-btn" onClick={submit} disabled={!canSubmit || start.isPending}>
          {start.isPending ? "Checking…" : "Send activation link"}
        </Button>
      </div>
      <div className="os-auth-card__footer"><Link to="/signin">Already activated? Sign in</Link></div>
    </AuthShell>
  );
}
